local files  = require 'files'
local csharp = require 'csharp'
local furi   = require 'file-uri'

local function findSource(text, offset)
    for start, word, finish in string.gmatch(text, '()"([^\r\n]-)"()', math.max(1, offset - 1000)) do
        if start <= offset and finish >= offset then
            return {
                type   = 'string',
                text   = word,
                start  = start,
                finish = finish - 1,
            }
        end
    end
    for start, word, finish in string.gmatch(text, '()([%w_]+)()', math.max(1, offset - 1000)) do
        if start <= offset and finish >= offset then
            return {
                type   = 'word',
                text   = word,
                start  = start,
                finish = finish - 1,
            }
        end
    end
    return nil
end

local ESCMap = {
    ['\\r']  = '\r',
    ['\\n']  = '\n',
    ['\\t']  = '\t',
    ['\\\\'] = '\\',
    ['\\"']  = '"'
}

local function decodeStringESC(str)
    return str
    : gsub('\\u(....)', function (int16)
        return utf8.char(tonumber(int16, 16))
    end)
    : gsub('\\x(..)', function (char16)
        -- TODO 遇到16进制字符时，假定前面有个 \xC2
        return string.char(0xC2, tonumber(char16, 16))
    end)
    : gsub('\\.', ESCMap)
end

local function getLabelAsString(source)
    local newText = decodeStringESC(source.text)
    if newText ~= source.text then
        return newText
    end
end

local function getLabelAsWord(source)
    local labels = csharp.getLabel(source.text)
    if not labels then
        return nil
    end
    local lines = {}
    for _, label in ipairs(labels) do
        lines[#lines+1] = ('%s [%s](%s)'):format(
            label.description,
            furi.decode(label.uri):match '[^/\\]+$',
            label.uri
        )
    end
    table.sort(lines)
    return table.concat(lines, '\n\n')
end

local function getLabel(source)
    if source.type == 'string' then
        -- 字符串
        return getLabelAsString(source)
    end
    if source.type == 'word' then
        return getLabelAsWord(source)
    end
end

local function hoverbyUri(uri, offset)
    local text = files.getText(uri)
    if not text then
        return
    end
    local source = findSource(text, offset)
    if not source then
        return
    end
    local label = getLabel(source)
    if not label then
        return
    end
    return {
        label       = label,
        source      = source,
    }
end

return {
    byUri = hoverbyUri,
}
