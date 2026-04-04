import { describe, it, expect } from "vitest";
import { parseSSEChunk, createSSEBuffer } from "../sse-parser";

describe("SSE parser", () => {
  describe("parseSSEChunk", () => {
    it("parses a valid SSE event", () => {
      const events: Array<{ type: string; data: unknown }> = [];
      parseSSEChunk(
        'event: step-start\ndata: {"step":"analyze"}\n\n',
        (type, data) => events.push({ type, data }),
      );
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: "step-start", data: { step: "analyze" } });
    });

    it("ignores SSE comment lines (heartbeat)", () => {
      const events: Array<{ type: string; data: unknown }> = [];
      parseSSEChunk(
        ": heartbeat 1234567890\n\nevent: done\ndata: {}\n\n",
        (type, data) => events.push({ type, data }),
      );
      // Only the done event should be dispatched — heartbeat ignored
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("done");
    });

    it("ignores heartbeat-only chunks", () => {
      const events: Array<{ type: string; data: unknown }> = [];
      parseSSEChunk(
        ": heartbeat 1234567890\n\n",
        (type, data) => events.push({ type, data }),
      );
      expect(events).toHaveLength(0);
    });
  });

  describe("createSSEBuffer", () => {
    it("handles heartbeat comments in buffered stream", () => {
      const events: Array<{ type: string; data: unknown }> = [];
      const feed = createSSEBuffer((type, data) =>
        events.push({ type, data }),
      );

      // Feed heartbeat + real event
      feed(": heartbeat 100\n\nevent: progress\ndata: {\"progress\":50}\n\n");

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: "progress", data: { progress: 50 } });
    });

    it("handles split heartbeat across chunks", () => {
      const events: Array<{ type: string; data: unknown }> = [];
      const feed = createSSEBuffer((type, data) =>
        events.push({ type, data }),
      );

      // Heartbeat split across two chunks
      feed(": heartbeat");
      feed(" 200\n\nevent: done\ndata: {}\n\n");

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("done");
    });
  });
});
