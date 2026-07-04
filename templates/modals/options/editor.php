        <div id="options-editor-view" class="hidden">
            <form id="form-options-editor" onsubmit="saveOptionsEditor(event)">
                <div class="form-group" style="margin-top: 15px;">
                    <label class="form-label" for="options-editor-theme">Tema do Editor</label>
                    <select class="form-input" id="options-editor-theme">
                        <optgroup label="Temas Escuros (Dark)">
                            <option value="dracula">Dracula (Padrão)</option>
                            <option value="ambiance">Ambiance</option>
                            <option value="chaos">Chaos</option>
                            <option value="clouds_midnight">Clouds Midnight</option>
                            <option value="cobalt">Cobalt</option>
                            <option value="gob">Green on Black</option>
                            <option value="gruvbox">Gruvbox</option>
                            <option value="idle_fingers">idle Fingers</option>
                            <option value="kr_theme">krTheme</option>
                            <option value="merbivore">Merbivore</option>
                            <option value="merbivore_soft">Merbivore Soft</option>
                            <option value="mono_industrial">Mono Industrial</option>
                            <option value="monokai">Monokai</option>
                            <option value="pastel_on_dark">Pastel on Dark</option>
                            <option value="solarized_dark">Solarized Dark</option>
                            <option value="terminal">Terminal</option>
                            <option value="tomorrow_night">Tomorrow Night</option>
                            <option value="tomorrow_night_blue">Tomorrow Night Blue</option>
                            <option value="tomorrow_night_bright">Tomorrow Night Bright</option>
                            <option value="tomorrow_night_eighties">Tomorrow Night 80s</option>
                            <option value="twilight">Twilight</option>
                            <option value="vibrant_ink">Vibrant Ink</option>
                            <option value="github_dark">GitHub Dark</option>
                        </optgroup>
                        <optgroup label="Temas Claros (Light)">
                            <option value="chrome">Chrome</option>
                            <option value="clouds">Clouds</option>
                            <option value="crimson_editor">Crimson Editor</option>
                            <option value="dawn">Dawn</option>
                            <option value="dreamweaver">Dreamweaver</option>
                            <option value="eclipse">Eclipse</option>
                            <option value="github">GitHub</option>
                            <option value="iplastic">IPlastic</option>
                            <option value="katzenmilch">KatzenMilch</option>
                            <option value="kuroir">Kuroir</option>
                            <option value="solarized_light">Solarized Light</option>
                            <option value="sqlserver">SQL Server</option>
                            <option value="textmate">TextMate</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="xcode">XCode</option>
                        </optgroup>
                    </select>
                </div>
                <div class="form-actions" style="margin-top: 15px;">
                    <button type="submit" class="btn btn-primary">Salvar Tema</button>
                </div>
            </form>
        </div>
