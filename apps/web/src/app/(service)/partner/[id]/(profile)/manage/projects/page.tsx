'use client'
import ProjectsTabNav from '@/components/pages/partner-profile/ProjectsTabNav'
import ProjectsMyProjectsView from '@/components/pages/partner-profile/ProjectsMyProjectsView'

export default function Page() {
  return (
    <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
      <ProjectsTabNav />
      <ProjectsMyProjectsView />
    </div>
  )
}
