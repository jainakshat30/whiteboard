"use client";

import { useEffect, useRef, useState } from "react";
import { useSceneStore } from "@/store/scene";
import { useToolStore } from "@/store/tools";
import { Element, createElement } from "@/types/elements";
import rough from "roughjs";
import { redo, undo } from "../store/undo";
import { getBoardConnection } from "@/store/yjs";
import {
  initializePresence,
  updateCursor,
  getRemoteCursors,
  updateIsDrawing,
} from "@/store/presence";
import { getWsTokenAction } from "@/app/actions/boards";
import { useConnectionStore } from "@/store/yjs";
import { CANVAS_FONT_FAMILY } from "@/config/font";
import { useThemeStore, getAdaptiveStrokeColor } from "@/store/theme";
import { useViewportStore } from "@/store/viewport";
import { UserNameModal } from "@/components/UserNameModal";

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
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isSpacePressedRef = useRef<boolean>(false);
  const [editingText, setEditingText] = useState<{ id: string; x: number; y: number; text: string } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current && editingText) {
      textAreaRef.current.style.width = "0px";
      textAreaRef.current.style.height = "0px";
      textAreaRef.current.style.width = `${textAreaRef.current.scrollWidth + 10}px`;
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [editingText?.text, editingText?.id]);

  const draggingRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    mode: "draw" | "move" | "resize" | "freedraw" | "erase";
    handle?: HandlePosition;
    origX?: number;
    origY?: number;
    origWidth?: number;
    origHeight?: number;
  } | null>(null);

  function screenToWorld(sx: number, sy: number) {
    const { zoom, panX, panY } = useViewportStore.getState();
    return {
      x: (sx - panX) / zoom,
      y: (sy - panY) / zoom,
    };
  }

  const userRole = useConnectionStore((s) => s.userRole);

  useEffect(() => {
    let active = true;
    useThemeStore.getState().initTheme();
    
    getWsTokenAction().then((token) => {
      if (!active) return;
      useSceneStore.getState().initBoard(boardId);
      const { provider } = getBoardConnection(boardId, token);
      initializePresence(boardId);
      const awareness = provider.awareness;
      
      awareness?.on("change", render);
    });

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

    const rc = rough.canvas(canvas);

    function drawElement(ctx: CanvasRenderingContext2D, el: Element) {
      const theme = useThemeStore.getState().theme;
      const stroke = getAdaptiveStrokeColor(el.strokeColor, theme);
      
      // Use the element ID to generate a consistent seed, stopping the flickering on re-render.
      const seed = parseInt(el.id.replace(/-/g, '').substring(0, 8), 16) || 1;

      const roughOptions = {
        stroke,
        strokeWidth: el.strokeWidth || 2,
        roughness: el.roughness ?? 1.2,
        strokeLineDash: el.strokeStyle === 'dashed' ? [8, 8] : el.strokeStyle === 'dotted' ? [2, 6] : undefined,
        seed,
        fill: el.fillColor !== "transparent" ? el.fillColor : undefined,
        fillStyle: "hachure",
        hachureAngle: 60,
        hachureGap: 4,
        preserveVertices: el.roundness === 'round' ? false : true,
      };
      
      // Handle opacity
      const opacity = el.opacity ?? 100;
      ctx.globalAlpha = opacity / 100;

      if (el.type === "freedraw" && el.points && el.points.length > 0) {
        const points: [number, number][] = el.points.map(p => [p.x, p.y]);
        if (points.length > 1) {
          rc.curve(points, {
            ...roughOptions,
            strokeWidth: el.strokeWidth || 2.5,
            fill: undefined,
          });
        } else {
          ctx.fillStyle = stroke;
          ctx.beginPath();
          ctx.arc(points[0][0], points[0][1], (el.strokeWidth || 2) / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        return;
      }

      if (el.type === "rectangle") {
        rc.rectangle(el.x, el.y, el.width, el.height, roughOptions);
      } else if (el.type === "ellipse") {
        rc.ellipse(
          el.x + el.width / 2,
          el.y + el.height / 2,
          Math.abs(el.width),
          Math.abs(el.height),
          roughOptions
        );
      } else if (el.type === "diamond") {
        const midX = el.x + el.width / 2;
        const midY = el.y + el.height / 2;
        rc.polygon([
          [midX, el.y],
          [el.x + el.width, midY],
          [midX, el.y + el.height],
          [el.x, midY]
        ], roughOptions);
      } else if (el.type === "line") {
        rc.line(el.x, el.y, el.x + el.width, el.y + el.height, {
          ...roughOptions,
          fill: undefined
        });
      } else if (el.type === "text") {
        const fontFamily = el.fontFamily || CANVAS_FONT_FAMILY;
        ctx.font = `${el.fontSize || 20}px ${fontFamily}`;
        ctx.fillStyle = stroke;
        ctx.textBaseline = "top";
        ctx.textAlign = (el.textAlign as CanvasTextAlign) || "left";
        ctx.fillText(el.text || "", el.x, el.y);
      }
      
      ctx.globalAlpha = 1;
    }

    function render() {
      if (!ctx || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const theme = useThemeStore.getState().theme;
      const isDark = theme === "dark";
      const { zoom, panX, panY } = useViewportStore.getState();

      // Clear & fill theme background
      const bgColor = isDark 
        ? useThemeStore.getState().canvasBackgroundDark 
        : useThemeStore.getState().canvasBackgroundLight;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      // Save context state & apply viewport pan translation + zoom scale
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      const elements = useSceneStore.getState().elements;
      for (const el of elements) {
        drawElement(ctx, el);
      }

      const selectedId = useSceneStore.getState().selectedId;
      const selected = elements.find((el) => el.id === selectedId);
      if (selected) {
        const handleColor = isDark ? "#a5b4fc" : "#4f46e5";
        ctx.strokeStyle = handleColor;
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.strokeRect(
          selected.x - 4,
          selected.y - 4,
          selected.width + 8,
          selected.height + 8,
        );
        ctx.setLineDash([]);

        ctx.fillStyle = isDark ? "#1e1b4b" : "#ffffff";
        ctx.strokeStyle = handleColor;
        ctx.lineWidth = 1 / zoom;
        const positions = [
          [selected.x, selected.y],
          [selected.x + selected.width, selected.y],
          [selected.x, selected.y + selected.height],
          [selected.x + selected.width, selected.y + selected.height],
        ];
        for (const [hx, hy] of positions) {
          ctx.fillRect(hx - 4, hy - 4, 8 / zoom, 8 / zoom);
          ctx.strokeRect(hx - 4, hy - 4, 8 / zoom, 8 / zoom);
        }
      }

      const cursors = getRemoteCursors(boardId);
      for (const state of cursors) {
        if (!state.cursor || !state.user) continue;
        const { x, y } = state.cursor;
        const { name, color } = state.user;
        const isDrawing = Boolean(state.isDrawing);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `bold ${13 / zoom}px ${CANVAS_FONT_FAMILY}`;
        ctx.fillStyle = color;
        const labelText = isDrawing ? `${name} ✏️ Drawing...` : name;
        ctx.fillText(labelText, x + 8 / zoom, y - 8 / zoom);
      }

      ctx.restore();
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const { zoom, panX, panY, setZoom, setPan } = useViewportStore.getState();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.1), 5.0);

      const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }

    const unsubscribeScene = useSceneStore.subscribe(() => render());
    const unsubscribeTheme = useThemeStore.subscribe(() => render());
    const unsubscribeViewport = useViewportStore.subscribe(() => render());

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !isSpacePressedRef.current && e.target === document.body) {
        isSpacePressedRef.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(boardId);
        else undo(boardId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const selectedId = useSceneStore.getState().selectedId;
        if (selectedId) {
          const selected = useSceneStore.getState().elements.find(el => el.id === selectedId);
          if (selected) {
            const { id, version, zIndex, ...props } = selected;
            const newEl = createElement({
              ...props,
              x: props.x + 20,
              y: props.y + 20,
            });
            useSceneStore.getState().addElement(newEl);
            useSceneStore.getState().setSelectedId(newEl.id);
          }
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const selectedId = useSceneStore.getState().selectedId;
        if (selectedId) {
          e.preventDefault();
          useSceneStore.getState().removeElement(selectedId);
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        isSpacePressedRef.current = false;
        const activeTool = useToolStore.getState().activeTool;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = activeTool === "hand" ? "grab" : "default";
        }
      }
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    // Clear awareness state before page unload to prevent ghost connections
    // Using both events for better browser compatibility
    const handlePageHide = () => {
      const { provider } = getBoardConnection(boardId, null);
      if (provider.awareness) {
        provider.awareness.setLocalState(null);
      }
    };
    
    const handleBeforeUnload = () => {
      const { provider } = getBoardConnection(boardId, null);
      if (provider.awareness) {
        provider.awareness.setLocalState(null);
      }
    };
    
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      active = false;
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      canvas.removeEventListener("wheel", handleWheel);
      const { provider } = getBoardConnection(boardId, null);
      provider.awareness?.off("change", render);
      // Clear cursor position when leaving to avoid ghost cursors
      updateCursor(boardId, null, null);
      unsubscribeScene();
      unsubscribeTheme();
      unsubscribeViewport();
    };
  }, [boardId]);

  // Sync cursor style with active tool
  const activeTool = useToolStore((s) => s.activeTool);
  useEffect(() => {
    if (!canvasRef.current) return;
    if (userRole === "AUDIENCE") {
      canvasRef.current.style.cursor = isPanningRef.current ? "grabbing" : "grab";
      return;
    }
    if (activeTool === "hand" || isSpacePressedRef.current) {
      canvasRef.current.style.cursor = isPanningRef.current ? "grabbing" : "grab";
    } else if (activeTool === "freedraw") {
      canvasRef.current.style.cursor = "crosshair";
    } else if (activeTool === "eraser") {
      canvasRef.current.style.cursor = "crosshair";
    } else if (activeTool === "text") {
      canvasRef.current.style.cursor = "text";
    } else {
      canvasRef.current.style.cursor = "default";
    }
  }, [activeTool, userRole]);

  function hitTest(x: number, y: number): Element | null {
    const elements = useSceneStore.getState().elements;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const minX = Math.min(el.x, el.x + el.width);
      const maxX = Math.max(el.x, el.x + el.width);
      const minY = Math.min(el.y, el.y + el.height);
      const maxY = Math.max(el.y, el.y + el.height);

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return el;
      }
    }
    return null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const tool = useToolStore.getState().activeTool;
    const { panX, panY } = useViewportStore.getState();

    // Hand tool, Middle click, Spacebar drag, or Audience -> start panning
    if (userRole === "AUDIENCE" || tool === "hand" || e.button === 1 || isSpacePressedRef.current) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - panX,
        y: e.clientY - panY,
      };
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      return;
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = screenToWorld(sx, sy);

    const theme = useThemeStore.getState().theme;
    const defaultStroke = theme === "dark" ? "#f3f4f6" : "#1e1e1e";
    
    const { strokeColor, fillColor, strokeWidth, strokeStyle, roughness, roundness, opacity, fontFamily, fontSize, textAlign } = useToolStore.getState();
    const finalStrokeColor = strokeColor === '#1e1e1e' || strokeColor === '#f3f4f6' ? defaultStroke : strokeColor;

    if (tool === "freedraw") {
      updateIsDrawing(boardId, true);
      const el = createElement({
        type: "freedraw",
        x,
        y,
        width: 0,
        height: 0,
        strokeColor: finalStrokeColor,
        fillColor: "transparent",
        strokeWidth,
        strokeStyle,
        roughness,
        roundness,
        opacity,
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

    if (tool === "text") {
      const hit = hitTest(x, y);
      if (hit && hit.type === "text") {
        setEditingText({ id: hit.id, x: hit.x, y: hit.y, text: hit.text || "" });
      } else {
        const el = createElement({
          type: "text",
          x,
          y,
          width: 100,
          height: 30,
          strokeColor: finalStrokeColor,
          fillColor: "transparent",
          text: "",
          fontSize: fontSize || 20,
          fontFamily: fontFamily || 'sans-serif',
          textAlign: textAlign || 'left',
        });
        useSceneStore.getState().addElement(el);
        setEditingText({ id: el.id, x, y, text: "" });
      }
      return;
    }

    if (tool === "eraser") {
      const hit = hitTest(x, y);
      if (hit) {
        useSceneStore.getState().removeElement(hit.id);
      }
      draggingRef.current = { id: "", startX: x, startY: y, mode: "erase" };
      return;
    }

    if (tool === "rectangle" || tool === "ellipse" || tool === "diamond" || tool === "line") {
      updateIsDrawing(boardId, true);
      const el = createElement({
        type: tool as any,
        x,
        y,
        width: 0,
        height: 0,
        strokeColor: finalStrokeColor,
        fillColor: tool === "line" ? "transparent" : fillColor,
        strokeWidth,
        strokeStyle,
        roughness,
        roundness,
        opacity,
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
          updateIsDrawing(boardId, true);
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
        updateIsDrawing(boardId, true);
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
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isPanningRef.current) {
      useViewportStore.getState().setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    const { x, y } = screenToWorld(sx, sy);
    updateCursor(boardId, x, y);

    const drag = draggingRef.current;
    if (!drag) return;

    if (drag.mode === "draw") {
      const el = useSceneStore.getState().elements.find(e => e.id === drag.id);
      if (el?.type === "line") {
        useSceneStore.getState().updateElement(drag.id, {
          width: x - drag.startX,
          height: y - drag.startY,
        });
      } else {
        useSceneStore.getState().updateElement(drag.id, {
          x: Math.min(drag.startX, x),
          y: Math.min(drag.startY, y),
          width: Math.abs(x - drag.startX),
          height: Math.abs(y - drag.startY),
        });
      }
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
    } else if (drag.mode === "erase") {
      const hit = hitTest(x, y);
      if (hit) {
        useSceneStore.getState().removeElement(hit.id);
      }
    }
  }

  function handlePointerUp() {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      const tool = useToolStore.getState().activeTool;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = tool === "hand" ? "grab" : "default";
      }
    }
    updateIsDrawing(boardId, false);
    draggingRef.current = null;
  }

  return (
    <>
      <UserNameModal boardId={boardId} />
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          isPanningRef.current = false;
          updateIsDrawing(boardId, false);
          updateCursor(boardId, null, null);
        }}
        onDoubleClick={(e) => {
          if (userRole !== "AUDIENCE") {
            const rect = canvasRef.current!.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const { x, y } = screenToWorld(sx, sy);
            const hit = hitTest(x, y);
            if (hit && hit.type === "text") {
              setEditingText({ id: hit.id, x: hit.x, y: hit.y, text: hit.text || "" });
            } else {
              useToolStore.getState().setTool("text");
              const theme = useThemeStore.getState().theme;
              const defaultStroke = theme === "dark" ? "#f3f4f6" : "#1e1e1e";
              const { strokeColor } = useToolStore.getState();
              const finalStrokeColor = strokeColor === '#1e1e1e' || strokeColor === '#f3f4f6' ? defaultStroke : strokeColor;

              const el = createElement({
                type: "text",
                x,
                y,
                width: 100,
                height: 30,
                strokeColor: finalStrokeColor,
                fillColor: "transparent",
                text: "",
                fontSize: useToolStore.getState().fontSize || 20,
                fontFamily: useToolStore.getState().fontFamily || 'sans-serif',
                textAlign: useToolStore.getState().textAlign || 'left',
              });
              useSceneStore.getState().addElement(el);
              setEditingText({ id: el.id, x, y, text: "" });
            }
          }
        }}
        style={{
          width: "100vw",
          height: "100vh",
          display: "block",
          touchAction: "none",
        }}
      />
      {editingText && (
        <textarea
          ref={textAreaRef}
          autoFocus
          wrap="off"
          value={editingText.text}
          onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
          onBlur={() => {
            if (editingText.text.trim() === "") {
              useSceneStore.getState().removeElement(editingText.id);
            } else {
              useSceneStore.getState().updateElement(editingText.id, {
                text: editingText.text,
              });
            }
            setEditingText(null);
          }}
          style={{
            position: "absolute",
            left: `${editingText.x * useViewportStore.getState().zoom + useViewportStore.getState().panX}px`,
            top: `${editingText.y * useViewportStore.getState().zoom + useViewportStore.getState().panY}px`,
            fontFamily: useSceneStore.getState().elements.find(e => e.id === editingText.id)?.fontFamily || CANVAS_FONT_FAMILY,
            fontSize: `${(useSceneStore.getState().elements.find(e => e.id === editingText.id)?.fontSize || 20) * useViewportStore.getState().zoom}px`,
            textAlign: useSceneStore.getState().elements.find(e => e.id === editingText.id)?.textAlign || "left",
            color: useToolStore.getState().strokeColor === '#1e1e1e' || useToolStore.getState().strokeColor === '#f3f4f6' 
              ? (useThemeStore.getState().theme === "dark" ? "#f3f4f6" : "#1e1e1e") 
              : useToolStore.getState().strokeColor,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            whiteSpace: "pre",
            overflow: "hidden",
            lineHeight: 1,
            zIndex: 50,
          }}
        />
      )}
    </>
  );
}