import { NextResponse } from 'next/server'

export async function GET() {
  const openapi = {
    openapi: '3.0.0',
    info: {
      title: 'Brain Bridge API',
      version: '1.0.0',
      description: 'Connect your local brain folder to ChatGPT'
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3054'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer'
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/tools/status': {
        post: {
          summary: 'Get device status',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Status response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      online: { type: 'boolean' },
                      deviceName: { type: 'string' },
                      vaultConnected: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/tools/search-brain': {
        post: {
          summary: 'Search local brain folder',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string', description: 'Search query' },
                    limit: { type: 'integer', default: 10 }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            path: { type: 'string' },
                            title: { type: 'string' },
                            snippet: { type: 'string' },
                            modifiedAt: { type: 'string' }
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
      },
      '/api/tools/read-file': {
        post: {
          summary: 'Read a file from brain folder',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['path'],
                  properties: {
                    path: { type: 'string', description: 'File path' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'File content',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      content: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/tools/create-note': {
        post: {
          summary: 'Create a new note in brain folder',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    path: { type: 'string', description: 'Optional file path' },
                    content: { type: 'string', description: 'File content' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Note created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      created: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/tools/append-note': {
        post: {
          summary: 'Append to existing note',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['path', 'content'],
                  properties: {
                    path: { type: 'string' },
                    content: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Note appended',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      appended: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/tools/export-claude-plan': {
        post: {
          summary: 'Export a Claude Code implementation plan',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string' },
                    summary: { type: 'string' },
                    projectGoal: { type: 'string' },
                    techStack: { type: 'string' },
                    implementationPlan: { type: 'string' },
                    tasks: { type: 'array', items: { type: 'string' } },
                    acceptanceCriteria: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Plan exported',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      path: { type: 'string' },
                      created: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/actions/search': {
        post: {
          summary: 'ChatGPT Custom Action: Search local vault',
          description: 'Search the connected local vault for files matching the query',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string', description: 'Search query' },
                    limit: { type: 'integer', default: 10, description: 'Maximum results to return' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Search results from local vault',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            path: { type: 'string', description: 'File path in vault' },
                            title: { type: 'string', description: 'File title' },
                            score: { type: 'number', description: 'Relevance score' },
                            snippet: { type: 'string', description: 'File content preview' },
                            modifiedAt: { type: 'string', description: 'Last modified timestamp' }
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
      },
      '/api/actions/read': {
        post: {
          summary: 'ChatGPT Custom Action: Read file from local vault (read-only)',
          description: 'Read the full content of a file from the local vault. Read-only action - no write operations supported.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['path'],
                  properties: {
                    path: { type: 'string', description: 'Relative file path in vault (from search result)' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'File content',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      path: { type: 'string', description: 'File path in vault' },
                      content: { type: 'string', description: 'Full file content' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Error reading file',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', description: 'Error message' }
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

  return NextResponse.json(openapi)
}
