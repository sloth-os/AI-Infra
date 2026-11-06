import { useState } from 'react'
import FleetGame from './Game'
import LifecycleCampaign from './campaign/Campaign'

export default function GameExperience({
  active,
  onLearn,
}: {
  active: boolean
  onLearn: () => void
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
  return (
    <>
      <FleetGame
        active={active && !campaign}
        onLearn={onLearn}
        onCampaign={() => select(true)}
      />
      <LifecycleCampaign
        active={active && campaign}
        onServing={() => select(false)}
        onLearn={onLearn}
      />
    </>
  )
}
