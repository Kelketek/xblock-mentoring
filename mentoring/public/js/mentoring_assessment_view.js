function MentoringAssessmentView(runtime, element, mentoring) {
    var gradeTemplate = _.template($('#xblock-grade-template').html());
    var submitDOM, nextDOM, reviewDOM, tryAgainDOM;
    var submitXHR;
    var checkmark;
    var active_child;

    var callIfExists = mentoring.callIfExists;

    function cleanAll() {
        // clean checkmark state
        checkmark.removeClass('checkmark-correct icon-ok fa-check');
        checkmark.removeClass('checkmark-incorrect icon-exclamation fa-exclamation');

        /* hide all children */
        $(':nth-child(2)', mentoring.children_dom).remove();

        $('.grade').html('');
        $('.attempts').html('');
    }

    function renderGrade() {
        var data = $('.grade', element).data();
        cleanAll();
        $('.grade', element).html(gradeTemplate(data));
        reviewDOM.hide();
        submitDOM.hide();
        nextDOM.hide();
        tryAgainDOM.show();

        var attempts_data = $('.attempts', element).data();
        if (attempts_data.num_attempts >= attempts_data.max_attempts) {
            tryAgainDOM.attr("disabled", "disabled");
        }
        else {
            tryAgainDOM.removeAttr("disabled");
        }

        mentoring.renderAttempts();
    }

    function handleTryAgain(result) {
        if (result.result !== 'success')
            return;

        active_child = -1;
        displayNextChild();
        tryAgainDOM.hide();
        submitDOM.show();
        nextDOM.show();
    }

    function tryAgain() {
        var success = true;
        var handlerUrl = runtime.handlerUrl(element, 'try_again');
        if (submitXHR) {
            submitXHR.abort();
        }
        submitXHR = $.post(handlerUrl, JSON.stringify({})).success(handleTryAgain);
    }

    function initXBlockView() {
        submitDOM = $(element).find('.submit .input-main');
        nextDOM = $(element).find('.submit .input-next');
        reviewDOM = $(element).find('.submit .input-review');
        tryAgainDOM = $(element).find('.submit .input-try-again');
        checkmark = $('.assessment-checkmark', element);

        submitDOM.show();
        submitDOM.bind('click', submit);
        nextDOM.bind('click', displayNextChild);
        nextDOM.show();
        reviewDOM.bind('click', renderGrade);
        tryAgainDOM.bind('click', tryAgain);

        active_child = mentoring.step-1;
        mentoring.readChildren();
        displayNextChild();

        mentoring.renderDependency();
    }

    function isLastChild() {
        return (active_child == mentoring.children.length-1);
    }

    function isDone() {
        return (active_child == mentoring.children.length);
    }

    function displayNextChild() {
        var options = {
            onChange: onChange
        };

        cleanAll();

        // find the next real child block to display. HTMLBlock are always displayed
        ++active_child;
        while (1) {
            var child = mentoring.displayChild(active_child, options);
            mentoring.publish_event({
                event_type: 'xblock.mentoring.assessment.shown',
                exercise_id: $(child).attr('name')
            });
            if ((typeof child !== 'undefined') || active_child == mentoring.children.length-1)
                break;
            ++active_child;
        }

        if (isDone())
            renderGrade();
        nextDOM.attr('disabled', 'disabled');
        reviewDOM.attr('disabled', 'disabled');
        validateXBlock();
    }

    function onChange() {
        // Assessment mode does not allow to modify answers.
        // Once an answer has been submitted (next button is enabled),
        // start ignoring changes to the answer.
        if (nextDOM.attr('disabled')) {
            validateXBlock();
        }
    }

    function handleSubmitResults(result) {
        $('.grade', element).data('score', result.score);
        $('.grade', element).data('correct_answer', result.correct_answer);
        $('.grade', element).data('incorrect_answer', result.incorrect_answer);
        $('.grade', element).data('max_attempts', result.max_attempts);
        $('.grade', element).data('num_attempts', result.num_attempts);
        $('.attempts', element).data('max_attempts', result.max_attempts);
        $('.attempts', element).data('num_attempts', result.num_attempts);

        if (result.completed) {
            checkmark.addClass('checkmark-correct icon-ok fa-check');
        }
        else {
            checkmark.addClass('checkmark-incorrect icon-exclamation fa-exclamation');
        }

        submitDOM.attr('disabled', 'disabled');

        /* Something went wrong with student submission, denied next question */
        if (result.step != active_child+1) {
            active_child = result.step-1;
            displayNextChild();
        }
        else {
            nextDOM.removeAttr("disabled");
            reviewDOM.removeAttr("disabled");
        }
    }

    function submit() {
        var success = true;
        var data = {};
        var child = mentoring.children[active_child];
        if (child && child.name !== undefined) {
            data[child.name] = callIfExists(child, 'submit');
        }
        var handlerUrl = runtime.handlerUrl(element, 'submit');
        if (submitXHR) {
            submitXHR.abort();
        }
        submitXHR = $.post(handlerUrl, JSON.stringify(data)).success(handleSubmitResults);
    }

    function validateXBlock() {
        var is_valid = true;
        var data = $('.attempts', element).data();
        var children = mentoring.children;

        // if ((data.max_attempts > 0) && (data.num_attempts >= data.max_attempts)) {
        //     is_valid = false;
        // }
        var child = mentoring.children[active_child];
        if (child && child.name !== undefined) {
            var child_validation = callIfExists(child, 'validate');
            if (_.isBoolean(child_validation)) {
                is_valid = is_valid && child_validation;
            }
        }


        if (!is_valid) {
            submitDOM.attr('disabled','disabled');
        }
        else {
            submitDOM.removeAttr("disabled");
        }

        if (isLastChild()) {
            nextDOM.hide();
            reviewDOM.show();
        }

    }

    initXBlockView();
}
