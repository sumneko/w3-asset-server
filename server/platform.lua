local script = ...

local function findExePath()
    local n = 0
    while arg[n-1] do
        n = n - 1
    end
    return arg[n]
end

local exePath = findExePath()
local exeDir  = exePath:match('(.+)[/\\][%w_.-]+$')
local dll     = package.cpath:match '[/\\]%?%.([a-z]+)'
package.cpath = ('%s/?.%s'):format(exeDir, dll)

local fs = require 'bee.filesystem'
local rootPath = fs.path(exePath):parent_path():parent_path():remove_filename():string()
if dll == '.dll' then
    rootPath = rootPath:gsub('/', '\\')
    package.path  = rootPath .. script .. '\\?.lua'
          .. ';' .. rootPath .. script .. '\\?\\init.lua'
else
    rootPath = rootPath:gsub('\\', '/')
    package.path  = rootPath .. script .. '/?.lua'
          .. ';' .. rootPath .. script .. '/?/init.lua'
end
