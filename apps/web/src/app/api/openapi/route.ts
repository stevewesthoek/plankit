import { NextResponse } from 'next/server'
import status from '../../../../../../docs/openapi.chatgpt/status.json'
import listSources from '../../../../../../docs/openapi.chatgpt/list-sources.json'
import getActiveSources from '../../../../../../docs/openapi.chatgpt/get-active-sources.json'
import setActiveSources from '../../../../../../docs/openapi.chatgpt/set-active-sources.json'
import listFiles from '../../../../../../docs/openapi.chatgpt/list-files.json'
import search from '../../../../../../docs/openapi.chatgpt/search.json'
import read from '../../../../../../docs/openapi.chatgpt/read.json'
import readFiles from '../../../../../../docs/openapi.chatgpt/read-files.json'
import searchAndRead from '../../../../../../docs/openapi.chatgpt/search-and-read.json'
import createArtifact from '../../../../../../docs/openapi.chatgpt/create-artifact.json'
import appendFile from '../../../../../../docs/openapi.chatgpt/append-file.json'
import writeFile from '../../../../../../docs/openapi.chatgpt/write-file.json'
import patchFile from '../../../../../../docs/openapi.chatgpt/patch-file.json'
import createPlan from '../../../../../../docs/openapi.chatgpt/create-plan.json'

const paths = {
  ...status.paths,
  ...listSources.paths,
  ...getActiveSources.paths,
  ...setActiveSources.paths,
  ...listFiles.paths,
  ...search.paths,
  ...read.paths,
  ...readFiles.paths,
  ...searchAndRead.paths,
  ...createArtifact.paths,
  ...appendFile.paths,
  ...writeFile.paths,
  ...patchFile.paths,
  ...createPlan.paths
}

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'BuildFlow API',
    version: '1.1.0',
    description:
      'Search, read, inspect, and write across connected local knowledge sources through BuildFlow. BuildFlow combines repositories, notes, research folders, and other connected local sources into one shared context for ChatGPT while keeping files local.'
  },
  servers: status.servers,
  components: status.components,
  paths
}

export async function GET() {
  return NextResponse.json(openapi)
}
