package com.xr18touch.pro;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "XR18Osc")
public class XR18OscPlugin extends Plugin {
    private static final String TAG = "XR18OscPlugin";

    private String targetIp = "192.168.1.100";
    private int targetPort = 10024;
    private DatagramSocket udpSocket;
    private volatile boolean running = false;
    private Thread rxThread;
    private final ExecutorService txExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void load() {
        super.load();
        initSocket();
    }

    private synchronized void initSocket() {
        closeSocketOnly();
        try {
            udpSocket = new DatagramSocket();
            udpSocket.setBroadcast(true);
            running = true;
            startReceiver();
            Log.i(TAG, "XR18 Android UDP Socket bound on port " + udpSocket.getLocalPort());
        } catch (Exception e) {
            Log.w(TAG, "Failed to bind UDP socket: " + e.getMessage());
            running = false;
        }
    }

    private void startReceiver() {
        rxThread = new Thread(() -> {
            byte[] buf = new byte[4096];
            while (running && udpSocket != null && !udpSocket.isClosed()) {
                try {
                    DatagramPacket packet = new DatagramPacket(buf, buf.length);
                    udpSocket.receive(packet);
                    int len = Math.min(packet.getLength(), 128);
                    String raw = new String(packet.getData(), 0, len, StandardCharsets.UTF_8);
                    int nullIdx = raw.indexOf('\0');
                    String address = nullIdx > 0 ? raw.substring(0, nullIdx) : raw;
                    if (!address.startsWith("/")) {
                        address = "/raw";
                    }
                    JSObject event = new JSObject();
                    event.put("timestamp", System.currentTimeMillis());
                    event.put("direction", "rx");
                    event.put("address", address);
                    notifyListeners("oscRx", event);
                } catch (IOException e) {
                    if (running) {
                        Log.w(TAG, "UDP receive warning: " + e.getMessage());
                    }
                }
            }
        }, "xr18-osc-rx");
        rxThread.setDaemon(true);
        rxThread.start();
    }

    private synchronized void closeSocketOnly() {
        running = false;
        if (udpSocket != null) {
            try {
                udpSocket.close();
            } catch (Exception ignored) {
            }
            udpSocket = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        closeSocketOnly();
        txExecutor.shutdownNow();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connectedToIp", targetIp);
        ret.put("port", targetPort);
        ret.put("udpSocketActive", udpSocket != null && !udpSocket.isClosed());
        call.resolve(ret);
    }

    @PluginMethod
    public void setConfig(PluginCall call) {
        String ip = call.getString("ip");
        Integer port = call.getInt("port");
        if (ip != null && !ip.trim().isEmpty()) {
            targetIp = ip.trim();
        }
        if (port != null && port > 0 && port <= 65535) {
            targetPort = port;
        }
        if (udpSocket == null || udpSocket.isClosed()) {
            initSocket();
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("ip", targetIp);
        ret.put("port", targetPort);
        ret.put("udpSocketActive", udpSocket != null && !udpSocket.isClosed());
        call.resolve(ret);
    }

    @PluginMethod
    public void sendOsc(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Missing OSC address");
            return;
        }

        Double floatDouble = call.getDouble("floatVal");
        Integer intVal = call.getInt("intVal");
        String strVal = call.getString("strVal");

        final String destIp = targetIp;
        final int destPort = targetPort;

        txExecutor.execute(() -> {
            try {
                if (udpSocket == null || udpSocket.isClosed()) {
                    initSocket();
                }
                if (udpSocket == null) return;

                byte[] payload = encodeOscMessage(
                    address,
                    floatDouble != null ? floatDouble.floatValue() : null,
                    intVal,
                    strVal
                );
                InetAddress addr = InetAddress.getByName(destIp);
                DatagramPacket packet = new DatagramPacket(payload, payload.length, addr, destPort);
                udpSocket.send(packet);
            } catch (Exception e) {
                Log.w(TAG, "UDP send error to " + destIp + ":" + destPort + " - " + e.getMessage());
            }
        });

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("address", address);
        call.resolve(ret);
    }

    private static byte[] pad4(String s) throws IOException {
        byte[] raw = s.getBytes(StandardCharsets.UTF_8);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(raw);
        out.write(0);
        while (out.size() % 4 != 0) {
            out.write(0);
        }
        return out.toByteArray();
    }

    private static byte[] encodeOscMessage(String address, Float floatVal, Integer intVal, String strVal) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(pad4(address));

        StringBuilder typeTag = new StringBuilder(",");
        ByteArrayOutputStream valOut = new ByteArrayOutputStream();

        if (floatVal != null) {
            typeTag.append('f');
            ByteBuffer bb = ByteBuffer.allocate(4).order(ByteOrder.BIG_ENDIAN);
            bb.putFloat(floatVal);
            valOut.write(bb.array());
        } else if (intVal != null) {
            typeTag.append('i');
            ByteBuffer bb = ByteBuffer.allocate(4).order(ByteOrder.BIG_ENDIAN);
            bb.putInt(intVal);
            valOut.write(bb.array());
        } else if (strVal != null) {
            typeTag.append('s');
            valOut.write(pad4(strVal));
        }

        out.write(pad4(typeTag.toString()));
        out.write(valOut.toByteArray());
        return out.toByteArray();
    }
}
