import { NextResponse } from 'next/server'

const components = {
  schemas: {},
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer'
    }
  }
}

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'BuildFlow API',
    version: '2.0.0',
    description:
      'One combined BuildFlow agent schema exposing the full repo-agnostic workflow through six high-level Custom GPT operations.'
  },
  servers: [
    {
      url: 'https://buildflow.prochat.tools',
      description: 'BuildFlow public endpoint'
    }
  ],
  components,
  paths: {
    '/api/actions/status': {
      get: {
        operationId: 'getBuildFlowStatus',
        summary: 'Get BuildFlow status',
        description: 'Return connection status and source counts.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'BuildFlow status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    connected: { type: 'boolean' },
                    sourceCount: { type: 'integer' },
                    sourcesAvailable: { type: 'boolean' }
                  },
                  required: ['connected', 'sourceCount', 'sourcesAvailable']
                }
              }
            }
          }
        }
      }
    },
    '/api/actions/context': {
      post: {
        operationId: 'setBuildFlowContext',
        summary: 'Set or inspect BuildFlow context',
        description: 'List sources, inspect active context, or update active sources.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  action: {
                    type: 'string',
                    enum: ['list_sources', 'get_active', 'set_active'],
                    description: 'Choose list_sources to list available sources, get_active to inspect active context, or set_active to change active sources.'
                  },
                  contextMode: {
                    type: 'string',
                    enum: ['single', 'multi', 'all'],
                    description: 'Active context mode used only with set_active.'
                  },
                  sourceIds: {
                    type: 'array',
                    description: 'Source ids to activate with set_active. Required for single and multi. Omit for all.',
                    items: { type: 'string' },
                    minItems: 0,
                    maxItems: 10
                  }
                },
                required: ['action']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Context result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    status: { type: 'string', enum: ['ok'] },
                    sources: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          id: { type: 'string' },
                          label: { type: 'string' },
                          enabled: { type: 'boolean' },
                          active: { type: 'boolean' },
                          type: { type: 'string' }
                        },
                        required: ['id', 'label', 'enabled', 'active']
                      }
                    },
                    contextMode: {
                      type: 'string',
                      enum: ['single', 'multi', 'all']
                    },
                    activeSourceIds: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['status', 'contextMode', 'activeSourceIds', 'sources']
                }
              }
            }
          },
          400: { description: 'Bad request' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/actions/inspect': {
      post: {
        operationId: 'inspectBuildFlowContext',
        summary: 'Inspect BuildFlow context',
        description: 'List repo structure or search active sources.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  mode: {
                    type: 'string',
                    enum: ['list_files', 'search'],
                    description: 'Use list_files for repo tree/folder inspection. Use search for filename/content search.'
                  },
                  sourceIds: {
                    type: 'array',
                    description: 'Optional source ids. If omitted, active source context is used.',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 10
                  },
                  path: {
                    type: 'string',
                    description: 'Relative folder path for list_files. Use empty string for repo root.'
                  },
                  query: {
                    type: 'string',
                    description: 'Search query used when mode is search.'
                  },
                  depth: {
                    type: 'integer',
                    description: 'Folder depth for list_files.',
                    default: 3,
                    minimum: 1,
                    maximum: 8
                  },
                  limit: {
                    type: 'integer',
                    description: 'Maximum results.',
                    default: 50,
                    minimum: 1,
                    maximum: 200
                  }
                },
                required: ['mode']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Inspect result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    mode: { type: 'string' },
                    entries: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: true
                      }
                    },
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/actions/read-context': {
      post: {
        operationId: 'readBuildFlowContext',
        summary: 'Read BuildFlow context',
        description: 'Read exact files or search and read relevant files.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  mode: {
                    type: 'string',
                    enum: ['read_paths', 'search_and_read'],
                    description: 'Use read_paths for exact paths. Use search_and_read when the exact file path is not known.'
                  },
                  sourceIds: {
                    type: 'array',
                    description: 'Optional source ids. If omitted, active context is used.',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 10
                  },
                  sourceId: {
                    type: 'string',
                    description: 'Optional single source id for exact reads when needed to avoid ambiguity.'
                  },
                  paths: {
                    type: 'array',
                    description: 'Exact relative file paths for read_paths.',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 10
                  },
                  query: {
                    type: 'string',
                    description: 'Search query for search_and_read.'
                  },
                  limit: {
                    type: 'integer',
                    description: 'Maximum files to read for search_and_read.',
                    default: 3,
                    minimum: 1,
                    maximum: 5
                  },
                  maxBytesPerFile: {
                    type: 'integer',
                    description: 'Maximum returned text per file.',
                    default: 30000,
                    minimum: 1000,
                    maximum: 60000
                  }
                },
                required: ['mode']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Read result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    mode: { type: 'string' },
                    files: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          sourceId: { type: 'string' },
                          path: { type: 'string' },
                          content: { type: 'string' },
                          truncated: { type: 'boolean' },
                          sizeBytes: { type: 'integer' },
                          modifiedAt: { type: 'string' },
                          error: { type: 'string' }
                        },
                        required: ['path']
                      }
                    },
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/actions/write-artifact': {
      post: {
        operationId: 'writeBuildFlowArtifact',
        summary: 'Write BuildFlow artifact',
        description: 'Create repo-local planning and prompt artifacts.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  sourceId: {
                    type: 'string',
                    description: 'Target source id. Required when more than one source is active.'
                  },
                  artifactType: {
                    type: 'string',
                    enum: ['implementation_plan', 'codex_prompt', 'claude_prompt', 'architecture_note', 'research_summary', 'test_plan', 'migration_plan', 'task_brief', 'general_doc'],
                    description: 'Artifact type to create.'
                  },
                  title: {
                    type: 'string',
                    description: 'Human-readable artifact title.'
                  },
                  content: {
                    type: 'string',
                    description: 'Markdown content.'
                  },
                  folder: {
                    type: 'string',
                    description: 'Optional safe relative folder. If omitted, BuildFlow chooses a safe default.'
                  },
                  filename: {
                    type: 'string',
                    description: 'Optional filename. If omitted, BuildFlow generates a timestamped slug filename.'
                  }
                },
                required: ['artifactType', 'title', 'content']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Artifact result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    status: { type: 'string' },
                    sourceId: { type: 'string' },
                    path: { type: 'string' },
                    artifactType: { type: 'string' },
                    created: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/actions/apply-file-change': {
      post: {
        operationId: 'applyBuildFlowFileChange',
        summary: 'Apply BuildFlow file change',
        description: 'Append, create, overwrite, or patch a safe repo file.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  changeType: {
                    type: 'string',
                    enum: ['append', 'create', 'overwrite', 'patch'],
                    description: 'Use append to add content, create to create a new file, overwrite to replace a file, or patch to replace an exact text block.'
                  },
                  sourceId: {
                    type: 'string',
                    description: 'Target source id. Required when more than one source is active.'
                  },
                  path: {
                    type: 'string',
                    description: 'Exact relative target file path.'
                  },
                  content: {
                    type: 'string',
                    description: 'Content for append, create, or overwrite.'
                  },
                  find: {
                    type: 'string',
                    description: 'Exact existing text block for patch.'
                  },
                  replace: {
                    type: 'string',
                    description: 'Replacement text for patch. Empty string is allowed to delete the found block.'
                  },
                  separator: {
                    type: 'string',
                    description: 'Separator used before appended content.',
                    default: '\n\n'
                  },
                  allowMultiple: {
                    type: 'boolean',
                    description: 'Allow patching multiple exact matches. Defaults to false.',
                    default: false
                  },
                  reason: {
                    type: 'string',
                    description: 'Brief reason for the file change.'
                  }
                },
                required: ['changeType', 'sourceId', 'path', 'reason']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'File change result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    status: { type: 'string' },
                    sourceId: { type: 'string' },
                    path: { type: 'string' },
                    changeType: { type: 'string' },
                    bytesWritten: { type: 'integer' },
                    bytesAppended: { type: 'integer' },
                    replacements: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export async function GET() {
  return NextResponse.json(openapi)
}
