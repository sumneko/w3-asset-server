local sp     = require 'bee.subprocess'
local nonil  = require 'without-check-nil'
local client = require 'provider.client'

local m = {}

function m.getIniter()
    local initer = {
        -- 文本同步方式
        textDocumentSync = {
            -- 打开关闭文本时通知
            openClose = true,
            -- 文本改变时完全通知 TODO 支持差量更新（2）
            change = 1,
        },

        hoverProvider = true,
        inlayHintProvider = true,
    }

    return initer
end

return m
