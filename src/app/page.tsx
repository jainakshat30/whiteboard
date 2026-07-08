import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to a default board
  redirect('/board/default')
}
