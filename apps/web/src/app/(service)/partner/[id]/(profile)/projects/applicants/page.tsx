'use client'
import ProjectsTabNav from '@/components/pages/partner-profile/ProjectsTabNav'
import ProjectsApplicantsView from '@/components/pages/partner-profile/ProjectsApplicantsView'

export default function Page() {
  return (
    <div className="bg-bg-card border border-line rounded-xl overflow-visible">
      <ProjectsTabNav />
      <ProjectsApplicantsView />
    </div>
  )
}
