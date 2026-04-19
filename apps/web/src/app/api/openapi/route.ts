import { NextResponse } from 'next/server'

export async function GET() {
  const openapi = {
    openapi: '3.1.0',
    info: {
      title: 'Brain Bridge API',
      version: '1.0.0',
      description: 'Search and read across connected knowledge sources through ChatGPT Custom Actions'
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3054'
      }
    ],
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer'
        }
      }
    },
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
          operationId: 'searchBrain',
          summary: 'ChatGPT Custom Action: Search connected knowledge sources (read-only)',
          description: 'Search across all connected knowledge sources for files matching the query. Results include the source identifier (sourceId) indicating which knowledge source each file came from. This is a read-only action that does not modify any files. Returns relative file paths safe for use with the read action. Absolute paths and ../ traversal are blocked.',
          security: [{ bearerAuth: [] }],
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
                            sourceId: { type: 'string', description: 'Source identifier (knowledge source where this file was found)' },
                            path: { type: 'string', description: 'Relative file path (safe for read action)' },
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
          operationId: 'readBrainFile',
          summary: 'ChatGPT Custom Action: Read file from knowledge sources (read-only)',
          description: 'Read the full content of a file from the connected knowledge sources. This is a read-only action that does not modify any files. Only accepts relative paths returned by the search action. Absolute paths and ../ traversal are blocked for safety.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['path'],
                  properties: {
                    path: { type: 'string', description: 'Relative file path in vault (from search result only)' }
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
      },
      '/api/actions/search-and-read': {
        post: {
          operationId: 'searchAndReadBrain',
          summary: 'ChatGPT Custom Action: Search and read knowledge sources (read-only, combined)',
          description: 'Search across all connected knowledge sources and read the top results in a single call. This is a read-only action that combines search and read operations for fewer confirmations. Limited to 3 results maximum. Does not modify any files. Absolute paths and ../ traversal are blocked.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string', description: 'Search query' },
                    limit: { type: 'integer', default: 2, description: 'Maximum results to return (capped at 3)' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Search results with file contents',
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
                            sourceId: { type: 'string', description: 'Source identifier (knowledge source where this file was found)' },
                            path: { type: 'string', description: 'Relative file path' },
                            title: { type: 'string', description: 'File title' },
                            snippet: { type: 'string', description: 'File content preview' },
                            content: { type: 'string', description: 'Full file content' },
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
      '/api/actions/append-inbox-note': {
        post: {
          operationId: 'appendInboxNote',
          summary: 'ChatGPT Custom Action: Create a new personal inbox note',
          description: 'Create a new markdown note in the personal inbox (01-inbox folder in the personal knowledge source). This action only allows writing to the inbox folder and never overwrites existing files. Filenames are auto-generated with timestamp to prevent collisions. The title is slugified for safe filename creation.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'content'],
                  properties: {
                    title: { type: 'string', description: 'Note title (used to generate filename)' },
                    content: { type: 'string', description: 'Markdown content for the note' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Note created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      path: { type: 'string', description: 'Path to created note in vault' },
                      status: { type: 'string', description: 'Status (created)' }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Authentication failed',
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
