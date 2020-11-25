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

proto.on('textDocument/hover', function (params)
    log.debug(util.dump(params))
end)
