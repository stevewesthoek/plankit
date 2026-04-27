import {
  getActiveContextLabel,
  getDisabledSourceCount,
  getFailedSourceCount,
  getIndexingSourceCount,
  getReadySourceCount,
  getWriteModeLabel
} from '../helpers'
import type { ActiveSourcesMode, KnowledgeSource, WriteMode } from '@buildflow/shared'

type DashboardOverviewProps = {
  loading: boolean
  sources: KnowledgeSource[]
  activeMode: ActiveSourcesMode
  writeMode: WriteMode
  onManageSources: () => void
  onAddSource: () => void
}

export function DashboardOverview({
  loading,
  sources,
  activeMode,
  writeMode,
  onManageSources,
  onAddSource
}: DashboardOverviewProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-base font-semibold text-slate-900 mb-6 dark:text-slate-50">Dashboard Overview</h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
              <div className="inline-block mb-3">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin dark:border-slate-700 dark:border-t-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium dark:text-slate-300">Loading sources...</p>
            <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Connecting to agent on port 3052</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            <div className="border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-medium text-slate-600 mb-2 dark:text-slate-400">Total Sources</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{sources.length}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-medium text-slate-600 mb-2 dark:text-slate-400">Enabled</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{sources.filter(s => s.enabled).length}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-medium text-slate-600 mb-2 dark:text-slate-400">Disabled</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{getDisabledSourceCount(sources)}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-medium text-slate-600 mb-2 dark:text-slate-400">Ready</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">{getReadySourceCount(sources)}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-medium text-slate-600 mb-2 dark:text-slate-400">Indexing</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">{getIndexingSourceCount(sources)}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-medium text-slate-600 mb-2 dark:text-slate-400">Failed</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-300">{getFailedSourceCount(sources)}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-medium text-slate-600 mb-2 dark:text-slate-400">Context Mode</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{getActiveContextLabel(activeMode)}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-xs font-medium text-slate-600 mb-2 dark:text-slate-400">Write Access</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{getWriteModeLabel(writeMode)}</div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onManageSources}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Manage Sources
            </button>
            <button
              type="button"
              onClick={onAddSource}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-300 transition-colors dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Add Source
            </button>
          </div>
        </>
      )}
    </div>
  )
}
