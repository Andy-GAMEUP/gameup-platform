'use client'
import { ReactNode, useState, createContext, useContext } from 'react'

interface TabsContextType {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider')
  }
  return context
}

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue = '', value, onValueChange, children, className = '' }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const activeTab = value !== undefined ? value : internalValue
  
  const setActiveTab = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`tabs-container ${className}`} data-active-tab={activeTab}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex space-x-1 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext()
  const isActive = activeTab === value

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { activeTab } = useTabsContext()

  if (activeTab !== value) return null

  return (
    <div className={`pt-4 ${className}`}>
      {children}
    </div>
  )
}
