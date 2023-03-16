local util      = require 'utility'
local cap       = require 'provider.capability'
local await     = require 'await'
local files     = require 'files'
local proto     = require 'proto.proto'
local define    = require 'proto.define'
local config    = require 'config'
local markdown  = require 'provider.markdown'
local client    = require 'provider.client'
local furi      = require 'file-uri'
local pub       = require 'pub'
local fs        = require 'bee.filesystem'
local csharp    = require 'csharp'

local function updateConfig()
    local configs = proto.awaitRequest('workspace/configuration', {
        items = {
            {
                section = 'W3',
            },
            {
                section = 'files.associations',
            },
            {
                section = 'files.exclude',
            }
        },
    })

    local updated = configs[1]
    local other   = {
        associations = configs[2],
        exclude      = configs[3],
    }

    config.setConfig(updated, other)

    csharp.init()
end

proto.on('initialize', function (params)
    client.init(params)
    return {
        capabilities = cap.getIniter(),
        serverInfo   = {
            name    = 'sumneko.lua',
        },
    }
end)

proto.on('initialized', function (params)
    updateConfig()
    proto.awaitRequest('client/registerCapability', {
        registrations = {
            -- 配置变化
            {
                id = '1',
                method = 'workspace/didChangeConfiguration',
            }
        }
    })
    return true
end)

proto.on('exit', function ()
    log.info('Server exited.')
    os.exit(true)
end)

proto.on('shutdown', function ()
    log.info('Server shutdown.')
    return true
end)

proto.on('workspace/didChangeConfiguration', function ()
    updateConfig()
end)

proto.on('textDocument/didOpen', function (params)
    local doc   = params.textDocument
    local uri   = doc.uri
    local text  = doc.text
    files.open(uri)
    files.setText(uri, text)
end)

proto.on('textDocument/didClose', function (params)
    local doc   = params.textDocument
    local uri   = doc.uri
    files.close(uri)
    files.remove(uri)
end)

proto.on('textDocument/didChange', function (params)
    local doc    = params.textDocument
    local change = params.contentChanges
    local uri    = doc.uri
    local text   = change[1].text
    if files.isOpen(uri) then
        files.setText(uri, text)
    end
end)

proto.on('textDocument/hover', function (params)
    await.close 'hover'
    await.setID 'hover'
    local core = require 'core.hover'
    local doc    = params.textDocument
    local uri    = doc.uri
    if not files.exists(uri) then
        return
    end
    local lines  = files.getLines(uri)
    local text   = files.getText(uri)
    local offset = define.offsetOfWord(lines, text, params.position)
    local hover = core.byUri(uri, offset)
    if not hover then
        return nil
    end
    local md = markdown()
    md:add('md', hover.label)
    md:add('md', hover.description)
    return {
        contents = {
            value = md:string(),
            kind  = 'markdown',
        },
        range = define.range(lines, text, hover.source.start, hover.source.finish),
    }
end)

proto.on('textDocument/inlayHint', function (params)
    await.close 'hover'
    await.setID 'hover'
    local core = require 'core.inlayHint'
    local doc    = params.textDocument
    local uri    = doc.uri
    if not files.exists(uri) then
        return
    end
    local lines = files.getLines(uri)
    local text  = files.getText(uri)
    local start, finish = define.unrange(lines, text, params.range)
    local results = core(uri, start, finish)
    local hintResults = {}
    for i, res in ipairs(results) do
        hintResults[i] = {
            label        = {
                {
                    value    = res.text,
                    tooltip  = res.tooltip,
                    location = res.source and define.location(
                                uri,
                                define.range(
                                    lines,
                                    text,
                                    res.source.start,
                                    res.source.finish
                                )
                            ),
                },
            },
            position     = res.position or define.position(lines, text, res.offset),
            kind         = res.kind,
            paddingLeft  = true,
            paddingRight = true,
        }
    end
    return hintResults
end)
