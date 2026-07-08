import { Canvas } from "@/components/Canvas"
import { Toolbar } from "@/components/Toolbar"

export default async function BoardPage({ params, }: { params: Promise<{ boardId: string }>}) {
  const { boardId } = await params

  return (
    <>
      <Toolbar />
      <Canvas boardId={boardId} />
    </>
  )
}