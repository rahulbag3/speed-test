"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_TEST_SIZE,
  getTestSize,
  measureDownload,
  measureLatency,
  measureUpload,
  qualityFor,
  warmUp,
  warmUpUpload,
  type Quality,
  type SpeedSample,
  type TestSizeId,
} from "@/lib/speedtest/measure";
import { detectEdge, getServer, type EdgeInfo, type TestServer } from "@/lib/speedtest/servers";

export type TestPhase =
  | "idle"
  | "preparing"
  | "ping"
  | "download"
  | "upload"
  | "done"
  | "error";

export interface SpeedResult {
  download: number | null;
  upload: number | null;
  latency: number | null;
  jitter: number | null;
  /** Share of pings that never came back, 0-100. */
  loss: number | null;
}

const EMPTY_RESULT: SpeedResult = {
  download: null,
  upload: null,
  latency: null,
  jitter: null,
  loss: null,
};

/** Human readable label for the current phase. */
const PHASE_LABELS: Record<TestPhase, string> = {
  idle: "Ready to test",
  preparing: "Preparing the connection",
  ping: "Measuring latency",
  download: "Measuring download",
  upload: "Measuring upload",
  done: "Test complete",
  error: "Test failed",
};

export interface SpeedTestState {
  phase: TestPhase;
  /** Live reading for whichever phase is running. */
  live: number;
  result: SpeedResult;
  downloadSamples: SpeedSample[];
  uploadSamples: SpeedSample[];
  error: string | null;
  quality: Quality | null;
  label: string;
  running: boolean;
  server: TestServer;
  setServerId: (id: string) => void;
  /** Nearest edge and reader address, once detected. Null until then. */
  edge: EdgeInfo | null;
  /** Payload size the next run will use. */
  sizeId: TestSizeId;
  setSizeId: (id: TestSizeId) => void;
  /** Human readable label for the selected size, e.g. "50 MB". */
  sizeLabel: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Drives a full test run: latency, then download, then upload.
 *
 * All three phases share one `AbortController`, so the Stop button cancels a
 * test that is already in flight rather than merely disabling future ones.
 */
export function useSpeedTest(initialServerId: string): SpeedTestState {
  const [serverId, setServerId] = useState(initialServerId);
  const [sizeId, setSizeId] = useState<TestSizeId>(DEFAULT_TEST_SIZE);
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [live, setLive] = useState(0);
  const [result, setResult] = useState<SpeedResult>(EMPTY_RESULT);
  const [downloadSamples, setDownloadSamples] = useState<SpeedSample[]>([]);
  const [uploadSamples, setUploadSamples] = useState<SpeedSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [edge, setEdge] = useState<EdgeInfo | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const server = getServer(serverId);

  /*
   * Find the nearest edge once on mount.
   *
   * The test always runs against the closest Cloudflare data centre anyway -
   * the address is anycast - so this only reports where that turned out to be.
   * It is fetched on its own rather than folded into a test run so the reader
   * can see the destination before starting, and so a result is never held up
   * waiting on a lookup that may be blocked.
   */
  useEffect(() => {
    const controller = new AbortController();
    void detectEdge(controller.signal).then((found) => {
      if (!controller.signal.aborted) setEdge(found);
    });
    return () => controller.abort();
  }, []);

  // Abandon any in-flight request if the component unmounts.
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPhase("idle");
    setLive(0);
    setResult(EMPTY_RESULT);
    setDownloadSamples([]);
    setUploadSamples([]);
    setError(null);
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPhase("idle");
    setLive(0);
  }, []);

  const start = useCallback(() => {
    if (controllerRef.current) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    const target = getServer(serverId);
    // Resolved when the run starts, not when it is configured, so changing the
    // selector mid-test cannot alter a measurement already under way.
    const payload = getTestSize(sizeId).bytes;

    setPhase("preparing");
    setLive(0);
    setResult(EMPTY_RESULT);
    setDownloadSamples([]);
    setUploadSamples([]);
    setError(null);

    void (async () => {
      try {
        // 1. Latency.
        setPhase("ping");
        const { latency, jitter, loss } = await measureLatency(target, signal);
        if (signal.aborted) return;
        setResult((current) => ({ ...current, latency, jitter, loss }));

        // 2. Open the connection before timing the real download, otherwise
        //    TCP slow start gets counted as your bandwidth.
        setPhase("preparing");
        await warmUp(target, signal);
        if (signal.aborted) return;

        // 3. Download, sampling as it arrives.
        setPhase("download");
        const download = await measureDownload(target, signal, payload, (sample) => {
          setLive(sample.mbps);
          setDownloadSamples((current) => [...current, sample]);
        });
        if (signal.aborted) return;
        setResult((current) => ({ ...current, download }));
        setLive(download);

        // 4. Upload, warmed up the same way as the download.
        setPhase("preparing");
        await warmUpUpload(target, signal);
        if (signal.aborted) return;

        setPhase("upload");
        try {
          const upload = await measureUpload(target, signal, payload, (sample) => {
            setLive(sample.mbps);
            setUploadSamples((current) => [...current, sample]);
          });
          if (signal.aborted) return;
          setResult((current) => ({ ...current, upload }));
          setLive(upload);
        } catch (cause) {
          /*
           * The download is already measured and valid. Letting an upload
           * failure fall through to the outer catch threw the whole run away
           * and left the page reading "test failed" with no download figure,
           * even though a good one had been sitting in state the whole time.
           * Report the upload problem, keep the download, and still finish.
           */
          if (signal.aborted) return;
          setError(
            cause instanceof Error
              ? `Upload failed: ${cause.message}`
              : "Upload failed.",
          );
        }

        setPhase("done");
      } catch (cause) {
        if (signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Something went wrong while running the test.",
        );
        setPhase("error");
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    })();
  }, [serverId, sizeId]);

  return {
    phase,
    live,
    result,
    downloadSamples,
    uploadSamples,
    error,
    quality: qualityFor(result.download),
    label: PHASE_LABELS[phase],
    running: phase !== "idle" && phase !== "done" && phase !== "error",
    server,
    setServerId,
    edge,
    sizeId,
    setSizeId,
    sizeLabel: getTestSize(sizeId).label,
    start,
    stop,
    reset,
  };
}
