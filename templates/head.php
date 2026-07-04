<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KodeWeb IDE</title>
    <!-- Favicon link -->
    <link rel="icon" type="image/svg+xml" href="logo.svg">
    <link rel="stylesheet" href="style.css">

    <!-- Ace Editor Library from CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/ace.js" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.32.7/ext-language_tools.min.js" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.1/marked.min.js" referrerpolicy="no-referrer"></script>
    
    <script>
        const CURRENT_USERNAME = <?= json_encode($current_username) ?>;
        const EDITOR_THEME = <?= json_encode($editor_theme) ?>;
    </script>
    <?php
    foreach ($active_plugins as $plugin) {
        if (!empty($plugin['css']) && is_array($plugin['css'])) {
            foreach ($plugin['css'] as $css) {
                echo '<link rel="stylesheet" href="plugins/' . htmlspecialchars($plugin['folder']) . '/' . htmlspecialchars($css) . '?v=' . time() . '">' . "\n";
            }
        }
    }
    ?>
</head>
