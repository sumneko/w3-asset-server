local files   = require 'files'
local csharp  = require 'csharp'
local symbols = require 'core.symbols'
local util    = require 'utility'
local guide   = require 'parser.guide'
local config  = require 'config'

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

local function getLabelAsWord(text)
    local labels = csharp.getLabel(text)
    if not labels then
        return nil
    end
    local result = {}
    for _, label in ipairs(labels) do
        result[#result+1] = label.description
    end
    table.sort(result)
    return table.concat(result, '/')
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
    --for start, word, finish in string.gmatch(text, '()([%w_]+)()') do
    --    if start < ofinish or finish > ostart then
    --        words[#words+1] = {
    --            type   = 'word',
    --            text   = word,
    --            start  = start,
    --            finish = finish - 1,
    --        }
    --    end
    --end
    return words
end

local function displayText(uri, results, start, finish)
    if not util.stringEndWith(uri, '.asset') then
        return
    end
    local words = getWords(uri, start, finish)
    for _, word in ipairs(words) do
        if word.type == 'string' then
            local text = getLabelAsString(word.text)
            if text then
                results[#results+1] = {
                    text    = text,
                    offset  = word.start,
                    kind    = 0,
                }
            end
        else
            local text = getLabelAsWord(word.text)
            if text then
                results[#results+1] = {
                    text    = text,
                    offset  = word.finish,
                    kind    = 0,
                }
            end
        end
    end
end

local function displayLineNum(uri, results, start, finish)
    if not config.config.inlayHint.triggerLineNum then
        return
    end
    if not util.stringEndWith(uri, '.lua') then
        return
    end
    local lineMap = symbols.getTriggerLines(uri)
    if not lineMap then
        return
    end
    local lines = files.getLines(uri)
    local startLine = guide.positionOf(lines, start)
    local finishLine = guide.positionOf(lines, finish)
    for i = startLine, finishLine do
        results[#results+1] = {
            text     = lineMap[i + 1] and ('[%03d]'):format(lineMap[i + 1]) or '[???]',
            position = { line = i, character = 0 },
            kind     = 0,
        }
    end
end

---@async
return function (uri, start, finish)
    local results = {}

    displayText(uri, results, start, finish)
    displayLineNum(uri, results, start, finish)

    return results
end
