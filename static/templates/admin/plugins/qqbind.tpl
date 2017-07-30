<h1>Registration Verify Code</h1>
<hr />

<form>
	<p>
		[[qqbind:admin.info]]
		<b style="color:green;">[[qqbind:admin.info.beta]]</b>
	</p><br />
	<div>
		<p>
			<label for="Width">[[qqbind:admin.host]]</label>
			<input type="text" data-field="qqbind:host" title="Host" class="form-control" placeholder="[[qqbind:admin.host.e]]"><br />
			<label for="Height">[[qqbind:admin.username]]</label>
			<input type="text" data-field="qqbind:username" title="Username" class="form-control" placeholder="[[qqbind:admin.username.e]]">
            <label for="Length">[[qqbind:admin.password]]</label>
			<input type="text" data-field="qqbind:password" title="Password" class="form-control" placeholder="[[qqbind:admin.password.e]]">
			<label for="Width">[[qqbind:admin.dbname]]</label>
            <input type="text" data-field="qqbind:dbname" title="DBname" class="form-control" placeholder="[[qqbind:admin.dbname.e]]"><br />
            <label for="Width">[[qqbind:admin.port]]</label>
			<input type="text" data-field="qqbind:port" title="Port" class="form-control" placeholder="[[qqbind:admin.port.e]"><br />
			
		</p>
	</div>
</form>

<button class="btn btn-lg btn-primary" id="save">[[qqbind:admin.save]]</button>

<script>
	require(['admin/settings'], function(Settings) {
		Settings.prepare();
	});
</script>