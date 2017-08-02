<div class="row">
	<div class="col-sm-4 col-sm-offset-4">
		<div class="panel panel-default" style="border-radius: 5px;border-color: #fff;">
			<div class="panel-heading" style="color:#fff">
				<h3 class="panel-title"><i class="fa fa-qq"></i> QQ 绑定</h3>
			</div>
			<div style="width: 100%;border-top-left-radius: 5px;border-top-right-radius: 5px;height: 201px;margin-top: -38px;display: block;background-image: url(https://piccdn.freejishu.com/images/2016/04/04/1173406.jpg);background-size: 100% 100%;"></div>
			<div class="panel-body" style="padding: 15px;border: 1px solid #ddd;border-top: 0;margin-bottom: -1px;border-bottom-left-radius: 5px;border-bottom-right-radius: 5px;">
				<p>
					欢迎使用QQ绑定服务，为了保证您的服务质量，请确保您需要绑定的号码真实有效！
				</p>
				<!-- IF error -->
				<div class="alert alert-danger">
					{error}
				</div>
				<!-- ENDIF error -->
				<p> 您的绑定代码为: <b><code>{key}</code></b></p>
				<a id="refresh_key" style="background-color: #73bbe8;padding: 9px;color: #fff;border-radius: 5px;border: 1px solid;display: inline-block;float: right;"><i class="fa fa-check-circle-o"></i> 验证绑定</a>
				<a id="check_QQ" style="background-color: #f24f44;padding: 9px;color: #fff;border-radius: 5px;border: 1px solid;display: inline-block;float: left;"><i class="fa fa-refresh"></i> 更换代码</a>
			</div>
		</div>
	</div>
</div>
<script>
	"use strict";
	//PA Core - QQ BIND Client Script
	//Made by PA Team
	//Version:0.1.0

	//init window
	//if title is not set,set the title by client script;
	if(document.title.indexOf("用户设置") == 0){
		document.title = document.title.replace("用户设置","");
	}
	if(document.title.indexOf("绑定QQ") == -1){
		document.title = "绑定QQ "+ document.title;
	}
	let cqq = {};
	cqq.lock = false;
	cqq.key = {key};
	cqq.r = document.getElementById("refresh_key");
	cqq.c = document.getElementById("check_QQ");
	
</script>
