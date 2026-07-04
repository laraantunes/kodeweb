        <div id="options-conn-view">
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-db-connections-list').classList.add('active'); loadDbConnectionsModalList();">Conexões DB</button>
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-ftp-connection').classList.add('active'); switchFtpModalTab('list');">Conexões FTP</button>
                <button class="btn btn-primary" onclick="closeModal('modal-options'); document.getElementById('modal-ssh-connection').classList.add('active'); switchSshModalTab('list');">Conexões SSH</button>
            </div>
        </div>
