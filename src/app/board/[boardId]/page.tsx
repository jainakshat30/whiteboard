import { Canvas } from '@/components/Canvas'
import { Toolbar } from '@/components/Toolbar'

export default function BoardPage({ params }: { params: { boardId: string } }) {
  return (
    <>
      <Toolbar />
      <Canvas boardId={params.boardId} />
    </>
  )
}