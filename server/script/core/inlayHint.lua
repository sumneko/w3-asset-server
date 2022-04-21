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

local function getLabelAsString(text)
    local newText = decodeStringESC(text)
    if newText ~= text then
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

local function getWords(uri, ostart, ofinish)
    local text = files.getText(uri)
    local words = {}
    for start, word, finish in string.gmatch(text, '()"([^\r\n]-)"()') do
        if start < ofinish or finish > ostart then
            words[#words+1] = {
                type   = 'string',
                text   = word,
                start  = start,
                finish = finish - 1,
            }
        end
    end
    for start, word, finish in string.gmatch(text, '()([%w_]+)()') do
        if start < ofinish or finish > ostart then
            words[#words+1] = {
                type   = 'word',
                text   = word,
                start  = start,
                finish = finish - 1,
            }
        end
    end
    return words
end

local function displayText(uri, results, start, finish)
    local words = getWords(uri, start, finish)
    for _, word in ipairs(words) do
        if word.type == 'string' then
            results[#results+1] = {
                text    = getLabelAsString(word.text),
                offset  = word.finish,
                kind    = 0,
                where   = 'righint',
            }
        else
        end
    end
end

---@async
return function (uri, start, finish)
    local results = {}

    displayText(uri, results, start, finish)

    return results
end
