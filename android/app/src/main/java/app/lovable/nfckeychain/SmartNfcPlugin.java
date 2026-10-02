package app.lovable.nfckeychain;

import android.app.Activity;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.Ndef;
import android.nfc.tech.NdefFormatable;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;

/**
 * Native Android NDEF access for the NFC Smart Keychain app.
 *
 * Operations are honest: a call only resolves when the hardware reports success.
 * Nothing here simulates a tag.
 *
 * NOT YET TESTED ON A PHYSICAL DEVICE — build in Android Studio and verify.
 */
@CapacitorPlugin(name = "SmartNfc")
public class SmartNfcPlugin extends Plugin {

    private static final int READER_FLAGS =
            NfcAdapter.FLAG_READER_NFC_A
                    | NfcAdapter.FLAG_READER_NFC_B
                    | NfcAdapter.FLAG_READER_NFC_F
                    | NfcAdapter.FLAG_READER_NFC_V
                    | NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS;

    private PluginCall pendingCall;
    private String pendingOperation;
    private NdefMessage pendingMessage;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable timeoutRunnable;

    private NfcAdapter adapter() {
        Activity activity = getActivity();
        if (activity == null) return null;
        return NfcAdapter.getDefaultAdapter(activity);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        NfcAdapter adapter = adapter();
        JSObject result = new JSObject();
        if (adapter == null) {
            result.put("available", false);
            result.put("reason", "This phone has no NFC hardware.");
        } else if (!adapter.isEnabled()) {
            result.put("available", false);
            result.put("reason", "NFC is switched off. Turn NFC on in phone settings and try again.");
        } else {
            result.put("available", true);
            result.put("reason", "Ready. Hold the tag flat against the back of the phone.");
        }
        call.resolve(result);
    }

    @PluginMethod
    public void read(PluginCall call) {
        start(call, "read", null);
    }

    @PluginMethod
    public void write(PluginCall call) {
        try {
            NdefMessage message = buildMessage(call.getArray("records"));
            start(call, "write", message);
        } catch (Exception e) {
            call.reject("invalid_data", "This content can't be turned into NFC data.");
        }
    }

    @PluginMethod
    public void erase(PluginCall call) {
        NdefMessage empty = new NdefMessage(new NdefRecord[]{
                new NdefRecord(NdefRecord.TNF_EMPTY, new byte[0], new byte[0], new byte[0])
        });
        start(call, "erase", empty);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        finish(null, "cancelled", "Cancelled.");
        call.resolve();
    }

    /* -------------------- session handling -------------------- */

    private void start(PluginCall call, String operation, NdefMessage message) {
        NfcAdapter adapter = adapter();
        if (adapter == null) {
            call.reject("unavailable", "This phone has no NFC hardware.");
            return;
        }
        if (!adapter.isEnabled()) {
            call.reject("disabled", "NFC is switched off. Turn NFC on in phone settings and try again.");
            return;
        }
        if (pendingCall != null) {
            call.reject("busy", "Another NFC action is already running.");
            return;
        }

        pendingCall = call;
        pendingOperation = operation;
        pendingMessage = message;

        int timeoutMs = call.getInt("timeoutMs", 20000);
        timeoutRunnable = () -> finish(null, "timeout",
                "No tag detected. Hold the tag against the back of the phone and try again.");
        handler.postDelayed(timeoutRunnable, timeoutMs);

        Activity activity = getActivity();
        activity.runOnUiThread(() -> adapter.enableReaderMode(activity, this::onTag, READER_FLAGS, null));
    }

    private void onTag(Tag tag) {
        String operation = pendingOperation;
        if (operation == null) return;

        Ndef ndef = Ndef.get(tag);
        try {
            if (ndef == null) {
                if ("read".equals(operation)) {
                    finish(null, "unsupported_tag", "This tag doesn't hold NDEF data.");
                    return;
                }
                NdefFormatable formatable = NdefFormatable.get(tag);
                if (formatable == null) {
                    finish(null, "unsupported_tag", "This tag can't store the kind of data the app writes.");
                    return;
                }
                formatable.connect();
                formatable.format(pendingMessage);
                formatable.close();
                JSObject ok = new JSObject();
                ok.put("success", true);
                finish(ok, null, null);
                return;
            }

            ndef.connect();

            if ("read".equals(operation)) {
                NdefMessage message = ndef.getNdefMessage();
                JSObject result = new JSObject();
                result.put("writable", ndef.isWritable());
                result.put("records", decode(message));
                ndef.close();
                finish(result, null, null);
                return;
            }

            if (!ndef.isWritable()) {
                ndef.close();
                finish(null, "read_only", "This tag is locked and can't be changed.");
                return;
            }

            byte[] bytes = pendingMessage.toByteArray();
            if (ndef.getMaxSize() < bytes.length) {
                ndef.close();
                finish(null, "too_large",
                        "This content is too big for the tag (" + bytes.length + " of " + ndef.getMaxSize() + " bytes).");
                return;
            }

            ndef.writeNdefMessage(pendingMessage);

            // read-after-write verification straight from the chip
            NdefMessage readBack = ndef.getNdefMessage();
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("records", decode(readBack));
            ndef.close();
            finish(result, null, null);
        } catch (android.nfc.TagLostException e) {
            finish(null, "tag_lost", "The tag moved away too soon. Hold it still until the result shows.");
        } catch (android.nfc.FormatException e) {
            finish(null, "invalid_data", "This tag holds data the app can't understand.");
        } catch (Exception e) {
            String message = e.getMessage();
            finish(null, "failed", message != null ? message : "The tag operation failed. Try again.");
        }
    }

    private JSArray decode(NdefMessage message) {
        JSArray out = new JSArray();
        if (message == null) return out;
        for (NdefRecord record : message.getRecords()) {
            JSObject item = new JSObject();
            byte[] payload = record.getPayload();
            String value;
            short tnf = record.getTnf();
            if (tnf == NdefRecord.TNF_WELL_KNOWN && java.util.Arrays.equals(record.getType(), NdefRecord.RTD_URI)) {
                item.put("recordType", "url");
                value = uriPrefix(payload.length > 0 ? payload[0] : 0)
                        + new String(payload, 1, Math.max(payload.length - 1, 0), StandardCharsets.UTF_8);
            } else if (tnf == NdefRecord.TNF_WELL_KNOWN && java.util.Arrays.equals(record.getType(), NdefRecord.RTD_TEXT)) {
                item.put("recordType", "text");
                int status = payload.length > 0 ? payload[0] & 0xFF : 0;
                int langLength = status & 0x3F;
                int offset = 1 + langLength;
                value = payload.length > offset
                        ? new String(payload, offset, payload.length - offset, StandardCharsets.UTF_8)
                        : "";
            } else if (tnf == NdefRecord.TNF_EMPTY) {
                continue;
            } else {
                item.put("recordType", "mime");
                item.put("mediaType", new String(record.getType(), StandardCharsets.UTF_8));
                value = new String(payload, StandardCharsets.UTF_8);
            }
            item.put("value", value);
            out.put(item);
        }
        return out;
    }

    private String uriPrefix(byte code) {
        String[] prefixes = {
                "", "http://www.", "https://www.", "http://", "https://", "tel:", "mailto:",
                "ftp://anonymous:anonymous@", "ftp://ftp.", "ftps://", "sftp://", "smb://",
                "nfs://", "ftp://", "dav://", "news:", "telnet://", "imap:", "rtsp://",
                "urn:", "pop:", "sip:", "sips:", "tftp:", "btspp://", "btl2cap://",
                "btgoep://", "tcpobex://", "irdaobex://", "file://", "urn:epc:id:",
                "urn:epc:tag:", "urn:epc:pat:", "urn:epc:raw:", "urn:epc:", "urn:nfc:"
        };
        int index = code & 0xFF;
        return index < prefixes.length ? prefixes[index] : "";
    }

    private NdefMessage buildMessage(JSArray records) throws Exception {
        JSONArray array = records != null ? records : new JSONArray();
        NdefRecord[] out = new NdefRecord[array.length()];
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.getJSONObject(i);
            String type = item.optString("recordType", "text");
            String value = item.optString("value", "");
            if ("url".equals(type)) {
                out[i] = NdefRecord.createUri(value);
            } else if ("mime".equals(type)) {
                out[i] = NdefRecord.createMime(item.optString("mediaType", "text/plain"),
                        value.getBytes(StandardCharsets.UTF_8));
            } else if ("empty".equals(type)) {
                out[i] = new NdefRecord(NdefRecord.TNF_EMPTY, new byte[0], new byte[0], new byte[0]);
            } else {
                out[i] = NdefRecord.createTextRecord("en", value);
            }
        }
        return new NdefMessage(out);
    }

    private void finish(JSObject result, String errorCode, String errorMessage) {
        PluginCall call = pendingCall;
        pendingCall = null;
        pendingOperation = null;
        pendingMessage = null;

        if (timeoutRunnable != null) {
            handler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
        }

        Activity activity = getActivity();
        NfcAdapter adapter = adapter();
        if (activity != null && adapter != null) {
            activity.runOnUiThread(() -> {
                try {
                    adapter.disableReaderMode(activity);
                } catch (Exception ignored) {
                }
            });
        }

        if (call == null) return;
        if (errorCode != null) {
            call.reject(errorMessage, errorCode);
        } else {
            call.resolve(result != null ? result : new JSObject());
        }
    }
}
