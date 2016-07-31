<!DOCTYPE html>
<html>
    <head>
        <title>Action done</title>

        <link href="https://fonts.googleapis.com/css?family=Lato:100" rel="stylesheet" type="text/css">
        <link href="vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
        <link href="css/grayscale.min.css" rel="stylesheet">

        <style>
            html, body {
                height: 100%;
            }

            body {
                margin: 0;
                padding: 0;
                width: 100%;
                display: table;
                font-weight: bold;
                font-family: 'Lato', sans-serif;
                background: url('./img/bg.jpg');
                color: snow;
            }

            .container {
                text-align: center;
                display: table-cell;
                vertical-align: middle;
            }

            .content {
                text-align: center;
                display: inline-block;
            }

            .title {
                font-size: 96px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="content">
                <div class="title">{{ $title }}</div>
                <div class="content">
                    <br />{{ $msg }}<br />
                    <br />
                    <?php 
                        if ($title != 'Error.'){
                            echo 'This service is composed of Laravel5, pixiv.js, startbootstrap-grayscale, and Faryne/api.neko.maid.tw';
                            echo '<br /><br /><br /><a href="/" class="btn btn-default btn-lg" style="font-size: inherit;">Return home</a>';
                        } else {
                            echo '<br /><a href="/" class="btn btn-default btn-lg" style="font-size: inherit;">Try again</a>';
                        }
                    ?>
                </div>
            </div>
        </div>
        <!-- jQuery -->
        <script src="vendor/jquery/jquery.js"></script>

        <!-- Bootstrap Core JavaScript -->
        <script src="vendor/bootstrap/js/bootstrap.min.js"></script>
     </body>
</html>
