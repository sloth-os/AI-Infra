import { useEffect, useState } from 'react'
import FleetGame from './Game'
import LifecycleCampaign from './campaign/Campaign'
import type { LessonKind } from '../learning/experience/model'

export default function GameExperience({
  active,
  onLearn,
  onStartLesson,
}: {
  active: boolean
  onLearn: () => void
  onStartLesson: (kind: LessonKind) => void
}) {
  const [campaign, setCampaign] = useState(() => {
    const query = new URLSearchParams(location.search)
    return (
      query.get('campaign') === 'lifecycle' ||
      (query.get('campaign') !== 'serving' && query.get('ui') !== 'tactical')
    )
  })
  const select = (next: boolean) => {
    setCampaign(next)
    const url = new URL(location.href)
    if (next) url.searchParams.set('campaign', 'lifecycle')
    else {
      url.searchParams.set('campaign', 'serving')
      url.searchParams.delete('operation')
      url.searchParams.delete('gameLevel')
    }
    history.replaceState({}, '', url)
  }
  useEffect(() => {
    if (!active) return
    const value = new URLSearchParams(location.search).get('campaign')
    if (value === 'lifecycle' || value === 'serving')
      setCampaign(value === 'lifecycle')
  }, [active])
  return (
    <>
      <FleetGame
        onStartLesson={onStartLesson}
        active={active && !campaign}
        onLearn={onLearn}
        onCampaign={() => select(true)}
      />
      <LifecycleCampaign
        onStartLesson={onStartLesson}
        active={active && campaign}
        onServing={() => select(false)}
        onLearn={onLearn}
      />
    </>
  )
}
