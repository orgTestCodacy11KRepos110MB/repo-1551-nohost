# 系统
## 管理员
1. 管理员的初始用户名、密码主要是用来登录此管理后台页面，具体如下所示：
 - 账号：admin
 - 密码：123456


2. 您也可以在此页面重新设置用户名和密码，请妥善保管好您的密码。

**注意：如果您忘记了用户名密码，可以执行如下脚本来重置密码为初始值
```n2 restart --reset```**
 

## 设置域名
您可以在这里设置Nohost服务器ip所对应的域名。

这样以后就可以直接通过域名来访问Nohost相关页面（如管理员页面，选择环境/抓包页面等）。

例如：可以设置 10.222.2.200 的域名为 imwebtest.test.com，这样就可以直接访问[http://imwebtest.test.com:8080/](http://imwebtest.test.com:8080/)去选择环境了。

**注意：设置的域名 DNS 一定要指向该IP，否则可能出现不可用状态，<del>`imwebtest.test.com`</del> 只是示例域名不要直接使用。**


## Auth Key
因为第三方应用要调Nohost的接口，所以在请求头里会设置x-whistle-auth-key 为此值。

所以，这个Auth Key主要是用来进行用户鉴权。

例如：您可以设置为nohost@imweb

## 重启服务
如果您觉得最近的服务处理有一些慢，或者Nohost服务占用机器cpu内存较高，可以点击一下这个“重启”按钮来重启Nohost服务~

*后续会支持设置定时重启。*
