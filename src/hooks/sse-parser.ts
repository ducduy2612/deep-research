/**
 * SSE parser utilities — pure functions for parsing Server-Sent Events streams.
 */

// SSE parser — splits on double-newlines, extracts event/data pairs.
export function parseSSEChunk(
  chunk: string,
  onEvent: (eventType: string, data: unknown) => void,
): void {
  const lines = chunk.split("\n");
  let currentEvent = "";
  let currentData = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      currentData = line.slice(6);
    } else if (line === "" && currentEvent && currentData) {
      // End of event — dispatch
      try {
        const parsed = JSON.parse(currentData);
        onEvent(currentEvent, parsed);
      } catch {
        // Malformed JSON — skip event
        console.warn("[useResearch] Failed to parse SSE data:", currentData);
      }
      currentEvent = "";
      currentData = "";
    }
  }
}

// SSE buffer — handles events split across chunks.
export function createSSEBuffer(
  onEvent: (eventType: string, data: unknown) => void,
): (chunk: string) => void {
  let buffer = "";

  return (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    // Last element might be incomplete — keep it in buffer
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      let eventType = "";
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          data = line.slice(6);
        }
      }
      if (eventType && data) {
        try {
          const parsed = JSON.parse(data);
          onEvent(eventType, parsed);
        } catch {
          console.warn("[useResearch] Failed to parse SSE data:", data);
        }
      }
    }
  };
}
