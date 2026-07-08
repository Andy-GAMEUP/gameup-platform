import {
  PartnerProjectModel as PartnerProject,
  PartnerProjectApplicationModel as PartnerProjectApplication,
} from '@gameup/db'

async function runCloseExpired() {
  try {
    const expired = await PartnerProject.find({
      status: 'recruiting',
      applicationDeadline: { $lt: new Date() },
    }).select('_id')

    if (expired.length === 0) return

    let matched = 0
    let unmatched = 0
    for (const project of expired) {
      const hasApproved = await PartnerProjectApplication.exists({ projectId: project._id, status: 'approved' })
      await PartnerProject.findByIdAndUpdate(project._id, { status: hasApproved ? 'matched' : 'unmatched' })
      if (hasApproved) matched++
      else unmatched++
    }
    console.log(`[project-status] 마감된 프로젝트 처리 — 매칭성공 ${matched}건, 매칭보류 ${unmatched}건`)
  } catch (e) {
    console.error('[project-status] 마감 처리 실패:', e)
  }
}

export function startCloseExpiredProjectsJob() {
  // 서버 시작 시 1회 실행 후 매 1시간마다 반복
  runCloseExpired()
  setInterval(runCloseExpired, 60 * 60 * 1000)
}
