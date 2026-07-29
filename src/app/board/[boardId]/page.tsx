import { Canvas } from "@/components/Canvas"
import { Toolbar } from "@/components/Toolbar"
import { ZoomToolbar } from "@/components/ZoomToolbar"

export default async function BoardPage({ params, }: { params: Promise<{ boardId: string }>}) {
  const { boardId } = await params

  return (
    <>
      <Toolbar />
      <ZoomToolbar />
      <Canvas boardId={boardId} />
    </>
  )
}