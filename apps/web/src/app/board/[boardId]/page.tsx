import { Canvas } from "@/components/Canvas"
import { Toolbar } from "@/components/Toolbar"
import { ZoomToolbar } from "@/components/ZoomToolbar"
import { MainMenu } from "@/components/MainMenu"
import { PropertiesPanel } from "@/components/PropertiesPanel"

export default async function BoardPage({ params, }: { params: Promise<{ boardId: string }>}) {
  const { boardId } = await params

  return (
    <>
      <MainMenu />
      <PropertiesPanel />
      <Toolbar />
      <ZoomToolbar />
      <Canvas boardId={boardId} />
    </>
  )
}