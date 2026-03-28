jQuery(document).ready(function($) {
    const form = $('#rl-lead-form');
    let gameHandler = null;

    // Form Submit => Ajax Call
    form.on('submit', function(e) {
        e.preventDefault();
        const btn = $(this).find('button');
        const originalText = btn.text();
        btn.text('Caricamento...').prop('disabled', true);

        $.post(RistoLoyalty.ajaxurl, {
            action: 'ristoloyalty_play',
            nonce: RistoLoyalty.nonce,
            name: $('#rl-name').val(),
            email: $('#rl-email').val()
        }, function(response) {
            if(response.success) {
                const data = response.data;
                $('#rl-alert').text(data.message).show();
                $('#rl-user-points span').text(data.points);
                $('#rl-user-points').show();

                $('#rl-lead-form-container').hide();
                $('#rl-game-container').show();
                
                const gameType = $('#rl-game-container').data('game-type');
                
                // Inizializza il gestore moduli dinamici
                gameHandler = new RistoGameHandler('rl-game-container', gameType);
                gameHandler.initGame(data.is_winner, data.prize); // Instanzia la Ruota, Slot o GrattaeVinci
                
            } else {
                alert('Errore: ' + (response.data ? response.data.message : 'Dati mancanti'));
            }
            btn.text(originalText).prop('disabled', false);
        }).fail(function() {
            alert('Errore di connessione al server.');
            btn.text(originalText).prop('disabled', false);
        });
    });

    $('#rl-play-again-btn').on('click', function() {
        $('#rl-game-container').hide();
        $(this).hide();
        $('#rl-lead-form-container').show();
        $('#rl-alert').hide();
    });
});
