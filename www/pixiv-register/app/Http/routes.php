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
    //return view('welcome');
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

    $task = new mails;
    $task->mail = $mail;
    $task->save();

    return view('done');
}]);