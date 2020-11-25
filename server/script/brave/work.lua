local brave   = require 'brave.brave'
local fs      = require 'bee.filesystem'
local furi    = require 'file-uri'
local util    = require 'utility'
local thread  = require 'bee.thread'

brave.on('loadProto', function ()
    local jsonrpc = require 'jsonrpc'
    while true do
        local proto, err = jsonrpc.decode(io.read, log.error)
        --log.debug('loaded proto', proto.method)
        if not proto then
            brave.push('protoerror', err)
            return
        end
        brave.push('proto', proto)
        thread.sleep(0.001)
    end
end)

brave.on('listDirectory', function (uri)
    local path = fs.path(furi.decode(uri))
    local uris = {}
    for child in path:list_directory() do
        local childUri = furi.encode(child:string())
        uris[#uris+1] = childUri
    end
    return uris
end)

brave.on('isDirectory', function (uri)
    local path = fs.path(furi.decode(uri))
    return fs.is_directory(path)
end)

brave.on('loadFile', function (uri)
    local filename = furi.decode(uri)
    return util.loadFile(filename)
end)

brave.on('saveFile', function (params)
    local filename = furi.decode(params.uri)
    return util.saveFile(filename, params.text)
end)
