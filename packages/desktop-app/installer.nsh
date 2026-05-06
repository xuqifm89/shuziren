!macro customHeader
  !system "echo '# 自定义安装头' > /dev/null"
!macroend

!macro customInstall
  ; 注册自定义协议
  WriteRegStr HKCR "szt" "" "URL:拾光引擎协议"
  WriteRegStr HKCR "szt" "URL Protocol" ""
  WriteRegStr HKCR "szt\shell\open\command" "" '"$INSTDIR\拾光引擎.exe" "%1"'
  
  ; 注册文件关联
  WriteRegStr HKCR ".szt" "" "ShuZiRen.Project"
  WriteRegStr HKCR "ShuZiRen.Project" "" "拾光引擎项目文件"
  WriteRegStr HKCR "ShuZiRen.Project\DefaultIcon" "" '"$INSTDIR\拾光引擎.exe",0'
  WriteRegStr HKCR "ShuZiRen.Project\shell\open\command" "" '"$INSTDIR\拾光引擎.exe" "%1"'
!macroend

!macro customUnInstall
  ; 清理注册表
  DeleteRegKey HKCR "szt"
  DeleteRegKey HKCR ".szt"
  DeleteRegKey HKCR "ShuZiRen.Project"
!macroend

!macro customRemoveFiles
  ; 保留用户数据
  ; 不删除 AppData 中的用户数据
!macroend
