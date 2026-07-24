'use client'
import ProjectsTabNav from '@/components/pages/partner-profile/ProjectsTabNav'
import ProjectsApplicationsView from '@/components/pages/partner-profile/ProjectsApplicationsView'

export default function Page() {
  return (
    <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
      <ProjectsTabNav />
      <ProjectsApplicationsView />
    </div>
  )
}
