local fs     = require 'bee.filesystem'
local config = require 'config'
local proto  = require 'proto'
local define = require 'proto.define'
local fsu    = require 'fs-utility'
local util   = require 'utility'
local furi   = require 'file-uri'

local m = {}

local function loadLabel(text, filePath)
    local currentDes
    for line in util.eachLine(text) do
        local des = line:match '%[LabelText%(%"(.-)%"%)'
        if des then
            currentDes = des
        end
        local key = line:match 'public%s+.-%s+([%w_]+)%s*[=;]'
        if key and currentDes then
            if not m.labels[key] then
                m.labels[key] = {}
            end
            m.labels[key][#m.labels[key]+1] = {
                uri         = furi.encode(filePath),
                description = currentDes
            }
            log.debug('获得Label:', key, currentDes, filePath)
            currentDes = nil
        end
    end
end

local function loadLabels(path)
    m.labels = {}
    local clock = os.clock()
    fsu.scanDirectory(path, function (filePath)
        if filePath:extension():string():lower() == '.cs' then
            loadLabel(fsu.loadFile(filePath), filePath:string())
        end
    end)
    log.info('读取Label耗时：', os.clock() - clock)
end

function m.init()
    local projectPath = fs.path(config.config.project.path)
    local csharpPath = projectPath / 'client\\UnityProject\\Assets\\Tools\\SSSEditor\\Scripts'
    if not fs.exists(projectPath) then
        log.warn('没有找到工程:', projectPath)
        proto.notify('window/showMessage', {
            type    = define.MessageType.Warning,
            message = '没有找到工程，请去 `文件 -> 首选项 -> 设置 -> 扩展 -> W3 -> 项目路径` 中填入你本地硬盘上的工程路径'
        })
        return
    end
    loadLabels(csharpPath)
end

function m.getLabel(key)
    if not m.labels then
        return nil
    end
    return m.labels[key]
end

return m
