local furi  = require 'file-uri'
local util  = require 'utility'
local nonil = require 'without-check-nil'
local files = require 'files'
local proto = require 'proto'

---@class SymbolManager
---@field _cache table<string, table|false>
local m = {}

m._cache = {}

---@param path string
---@return table?
function m.loadSymbols(path)
    for _ = 1, 10 do
        path = path:gsub('/[^/]+$', '')
        if m._cache[path] then
            return m._cache[path] or nil
        end
        local buf = util.loadFile(path .. '/symbols.lua')
        if buf then
            m._cache[path] = false
            local f = load(buf)
            if not f then
                return nil
            end
            local suc, symbols = pcall(f)
            if not suc then
                return nil
            end
            m._cache[path] = symbols
            return symbols
        end
    end
    m._cache[path] = false
    return nil
end

function m.reset()
    if not next(m._cache) then
        return
    end
    m._cache = {}
    proto.awaitRequest('workspace/inlayHint/refresh', nil)
end

---@param uri string
---@return table<integer, integer>?
function m.getTriggerLines(uri)
    local path = furi.decode(uri):gsub('\\', '/')
    local symbols = m.loadSymbols(path)
    if not symbols then
        return nil
    end

    nonil.enable()
    local fileSymbol
    for _, f in ipairs(symbols['FILE']) do
        if util.stringEndWith(path, f['path']) then
            fileSymbol = f
            break
        end
    end
    nonil.disable()

    if not fileSymbol then
        return nil
    end

    local lineSymbols = fileSymbol['symbol']
    if not lineSymbols then
        return nil
    end

    local lineMap = {}
    for _, lineSymbol in ipairs(lineSymbols) do
        lineMap[lineSymbol['luaLine']] = lineSymbol['triggerLine']
    end

    return lineMap
end

files.watch(function (ev, uri)
    if util.stringEndWith(uri, '.lua') then
        m.reset()
    end
end)

return m
