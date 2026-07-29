"use client";

import { useEffect, useRef } from "react";
import { useSceneStore } from "@/store/scene";
import { useToolStore } from "@/store/tools";
import { Element, createElement } from "@/types/elements";
import { redo, undo } from "../store/undo";
import { getBoardConnection } from "@/store/yjs";
import {
  initializePresence,
  updateCursor,
  getRemoteCursors,
} from "@/store/presence";

export type HandlePosition = "nw" | "ne" | "sw" | "se";

const HANDLE_SIZE = 8;

export function getHandleAt(
  el: Element,
  x: number,
  y: number,
): HandlePosition | null {
  const handles: { pos: HandlePosition; hx: number; hy: number }[] = [
    { pos: "nw", hx: el.x, hy: el.y },
    { pos: "ne", hx: el.x + el.width, hy: el.y },
    { pos: "sw", hx: el.x, hy: el.y + el.height },
    { pos: "se", hx: el.x + el.width, hy: el.y + el.height },
  ];

  for (const h of handles) {
    if (
      x >= h.hx - HANDLE_SIZE &&
      x <= h.hx + HANDLE_SIZE &&
      y >= h.hy - HANDLE_SIZE &&
      y <= h.hy + HANDLE_SIZE
    ) {
      return h.pos;
    }
  }

  return null;
}

type CanvasProps = {
  boardId: string;
};

export function Canvas({ boardId }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    mode: "draw" | "move" | "resize" | "freedraw";
    handle?: HandlePosition;
    origX?: number;
    origY?: number;
    origWidth?: number;
    origHeight?: number;
  } | null>(null);

  useEffect(() => {
    useSceneStore.getState().initBoard(boardId);
    const { provider } = getBoardConnection(boardId);
    initializePresence(boardId);
    const awareness = provider.awareness;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resizeCanvas() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.scale(dpr, dpr);
      render();
    }

    function drawElement(ctx: CanvasRenderingContext2D, el: Element) {
      ctx.strokeStyle = el.strokeColor;
      ctx.fillStyle = el.fillColor;
      ctx.lineWidth = 2;

      if (el.type === "freedraw" && el.points) {
        ctx.beginPath();
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        el.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        return;
      }

      if (el.type === "rectangle") {
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      } else if (el.type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(
          el.x + el.width / 2,
          el.y + el.height / 2,
          Math.abs(el.width / 2),
          Math.abs(el.height / 2),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
    }

    function render() {
      if (!ctx || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const elements = useSceneStore.getState().elements;
      for (const el of elements) {
        drawElement(ctx, el);
      }

      const selectedId = useSceneStore.getState().selectedId;
      const selected = elements.find((el) => el.id === selectedId);
      if (selected) {
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          selected.x - 4,
          selected.y - 4,
          selected.width + 8,
          selected.height + 8,
        );
        ctx.setLineDash([]);

        ctx.fillStyle = "white";
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 1;
        const positions = [
          [selected.x, selected.y],
          [selected.x + selected.width, selected.y],
          [selected.x, selected.y + selected.height],
          [selected.x + selected.width, selected.y + selected.height],
        ];
        for (const [hx, hy] of positions) {
          ctx.fillRect(hx - 4, hy - 4, 8, 8);
          ctx.strokeRect(hx - 4, hy - 4, 8, 8);
        }
      }

      const cursors = getRemoteCursors(boardId);
      for (const state of cursors) {
        if (!state.cursor || !state.user) continue;
        const { x, y } = state.cursor;
        const { name, color } = state.user;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = color;
        ctx.fillText(name, x + 8, y - 8);
      }
    }

    const unsubscribe = useSceneStore.subscribe(() => render());

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(boardId);
        else undo(boardId);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const selectedId = useSceneStore.getState().selectedId;
        if (selectedId) {
          e.preventDefault();
          useSceneStore.getState().removeElement(selectedId);
        }
      }
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown);
    
    awareness?.on("change", render);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      awareness?.off("change", render);
      unsubscribe();
    };
  }, [boardId]);

  function hitTest(x: number, y: number): Element | null {
    const elements = useSceneStore.getState().elements;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (
        x >= el.x &&
        x <= el.x + el.width &&
        y >= el.y &&
        y <= el.y + el.height
      ) {
        return el;
      }
    }
    return null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const tool = useToolStore.getState().activeTool;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "freedraw") {
      const el = createElement({
        type: "freedraw",
        x,
        y,
        width: 0,
        height: 0,
        strokeColor: "#1e1e1e",
        fillColor: "transparent",
        points: [{ x, y }],
      });
      useSceneStore.getState().addElement(el);
      draggingRef.current = {
        id: el.id,
        startX: x,
        startY: y,
        mode: "freedraw",
      };
      return;
    }

    if (tool === "rectangle" || tool === "ellipse") {
      const el = createElement({
        type: tool,
        x,
        y,
        width: 0,
        height: 0,
        strokeColor: "#1e1e1e",
        fillColor: "transparent",
      });
      useSceneStore.getState().addElement(el);
      draggingRef.current = { id: el.id, startX: x, startY: y, mode: "draw" };
      return;
    }

    if (tool === "selection") {
      const selectedId = useSceneStore.getState().selectedId;
      const selected = useSceneStore
        .getState()
        .elements.find((el) => el.id === selectedId);

      if (selected) {
        const handle = getHandleAt(selected, x, y);
        if (handle) {
          draggingRef.current = {
            id: selected.id,
            startX: x,
            startY: y,
            mode: "resize",
            handle,
            origX: selected.x,
            origY: selected.y,
            origWidth: selected.width,
            origHeight: selected.height,
          };
          return;
        }
      }

      const hit = hitTest(x, y);
      if (hit) {
        useSceneStore.getState().setSelectedId(hit.id);
        draggingRef.current = {
          id: hit.id,
          startX: x,
          startY: y,
          mode: "move",
          origX: hit.x,
          origY: hit.y,
        };
      } else {
        useSceneStore.getState().setSelectedId(null);
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = draggingRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateCursor(boardId, x, y);

    if (!drag) return;

    if (drag.mode === "draw") {
      useSceneStore.getState().updateElement(drag.id, {
        x: Math.min(drag.startX, x),
        y: Math.min(drag.startY, y),
        width: Math.abs(x - drag.startX),
        height: Math.abs(y - drag.startY),
      });
    } else if (drag.mode === "move") {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      useSceneStore.getState().updateElement(drag.id, {
        x: drag.origX! + dx,
        y: drag.origY! + dy,
      });
    } else if (drag.mode === "resize" && drag.handle) {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      let { origX: ox, origY: oy, origWidth: ow, origHeight: oh } = drag;

      let newX = ox!;
      let newY = oy!;
      let newWidth = ow!;
      let newHeight = oh!;

      if (drag.handle.includes("e")) newWidth = ow! + dx;
      if (drag.handle.includes("w")) {
        newWidth = ow! - dx;
        newX = ox! + dx;
      }
      if (drag.handle.includes("s")) newHeight = oh! + dy;
      if (drag.handle.includes("n")) {
        newHeight = oh! - dy;
        newY = oy! + dy;
      }

      if (newWidth < 0) {
        newX += newWidth;
        newWidth = Math.abs(newWidth);
      }
      if (newHeight < 0) {
        newY += newHeight;
        newHeight = Math.abs(newHeight);
      }

      useSceneStore.getState().updateElement(drag.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    } else if (drag.mode === "freedraw") {
      const el = useSceneStore
        .getState()
        .elements.find((element) => element.id === drag.id);
      if (!el?.points) return;
      const points = [...el.points, { x, y }];
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      useSceneStore.getState().updateElement(drag.id, {
        points,
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      });
    }
  }

  function handlePointerUp() {
    draggingRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        updateCursor(boardId, null, null);
      }}
      style={{
        width: "100vw",
        height: "100vh",
        display: "block",
        touchAction: "none",
      }}
    />
  );
}