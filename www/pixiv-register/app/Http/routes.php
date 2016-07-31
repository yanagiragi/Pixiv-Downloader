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
    if( App\mails::all()){
        ; // if database is empty
    } 
    else if( App\mails::where('mail',$mail)->firstOrFail() ){
        // if databases contains this mail, reject request
        return View::make('done', array('title' => 'Error.','msg' => 'You had already subscribed.'));    
    }

    $task = new mails;
    $task->mail = $mail;
    $task->hash = urlencode(crypt(time(),rand(0,time())));
    $task->save();
    
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