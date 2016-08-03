<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the controller to call when that URI is requested.
|
*/

use App\mails;
use Illuminate\Http\Request;

Route::get('/', function () {
    return view('main');
});

Route::post('/register', ['as' => 'register', function (Request $request) {
	
    $validator = Validator::make($request->all(), [
        'email' => 'required|max:255',
    ]);
    
    if($validator->fails()){
    	return redirect('/')
            ->withInput()
            ->withErrors($validator);
    }
    
    $mail = e($request->email);
    
    if( App\mails::where('mail',$mail)->first() ){
	     // if databases contains this mail, reject request
	     return View::make('done', array('title' => 'Error.','msg' => 'You had already subscribed.'));    
	}

	/* Save to DB */
    $task = new mails;
    $task->mail = $mail;
    $task->hash = urlencode(crypt(time(),rand(0,time())));
    $task->save();
    
    /* Send Notice Mail immediately */
    $client = new GuzzleHttp\Client();
    $res = $client->request('POST', 'https://api.sendgrid.com/api/mail.send.json', [
        	'form_params'=> [
        		'api_user' => config('app.SendGridacc'),
	        	'api_key'  => config('app.SendGridpwd'),
	        	'to' => $mail,
	        	'toname' => $mail,
	        	'cc' => config('app.SendGridccmail'),
	        	'ccname' => config('app.SendGridccname'),
	        	'subject' => 'Hello Pixiv! -- Subscription Notice',
	        	'html' => '
	        		<p>Thank you for subscribing!<br /><br />
	        		If you regret, click
	        		<a href="http://'.config('app.remoteAddr').'/cancel/'.$task->hash.'" />here</a>.</p>
	        		',
	        	'from' => config('app.SendGridfrom')
	        ]
        ]);
    
    return View::make('done', array('title' => 'Done.','msg' => 'Mail will be sent every 3:00 AM.'));
    
}]);

Route::get('/cancel/{id}', function($id){
   
   // @return (int) ammount of row effected.
   $effects = App\mails::where('hash',urlencode($id))->delete();

   if($effects == 0)
        return redirect('/error');
   else
        return redirect('/cancel');
   
})->where('id', '(.*)');

Route::get('/cancel', function(){
    return View::make('done', array('title' => 'Done.','msg' => 'your subscription has been canceled.'));
});

Route::get('/error', function(){
    return View::make('done', array('title' => 'Error.','msg' => 'Something went wrong.'));
});
