/**
 * Namespace for comments
 */
WCF.Comment = { };

/**
 * Comment support for WCF
 * 
 * @author	Alexander Ebert
 * @copyright	2001-2014 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 */
WCF.Comment.Handler = Class.extend({
	/**
	 * input element to add a comment
	 * @var	jQuery
	 */
	_commentAdd: null,
	
	/**
	 * list of comment buttons per comment
	 * @var	object
	 */
	_commentButtonList: { },
	
	/**
	 * list of comment objects
	 * @var	object
	 */
	_comments: { },
	
	/**
	 * comment container object
	 * @var	jQuery
	 */
	_container: null,
	
	/**
	 * container id
	 * @var	string
	 */
	_containerID: '',
	
	/**
	 * number of currently displayed comments
	 * @var	integer
	 */
	_displayedComments: 0,
	
	/**
	 * button to load next comments
	 * @var	jQuery
	 */
	_loadNextComments: null,
	
	/**
	 * buttons to load next responses per comment
	 * @var	object
	 */
	_loadNextResponses: { },
	
	/**
	 * action proxy
	 * @var	WCF.Action.Proxy
	 */
	_proxy: null,
	
	/**
	 * list of response objects
	 * @var	object
	 */
	_responses: { },
	
	/**
	 * user's avatar
	 * @var	string
	 */
	_userAvatar: '',
	
	/**
	 * data of the comment the active guest user is about to create
	 * @var	object
	 */
	_commentData: { },
	
	/**
	 * guest dialog with username input field and recaptcha
	 * @var	jQuery
	 */
	_guestDialog: null,

	/**
	 * true if the guest has to solve a recaptcha challenge to save the comment
	 * @var	boolean
	 */
	_useRecaptcha: true,
	
	/**
	 * Initializes the WCF.Comment.Handler class.
	 * 
	 * @param	string		containerID
	 * @param	string		userAvatar
	 */
	init: function(containerID, userAvatar) {
		this._commentAdd = null;
		this._commentButtonList = { };
		this._comments = { };
		this._containerID = containerID;
		this._displayedComments = 0;
		this._loadNextComments = null;
		this._loadNextResponses = { };
		this._responses = { };
		this._userAvatar = userAvatar;
		
		this._container = $('#' + $.wcfEscapeID(this._containerID));
		if (!this._container.length) {
			console.debug("[WCF.Comment.Handler] Unable to find container identified by '" + this._containerID + "'");
		}
		
		this._proxy = new WCF.Action.Proxy({
			failure: $.proxy(this._failure, this),
			success: $.proxy(this._success, this)
		});
		
		this._initComments();
		this._initResponses();
		
		// add new comment
		if (this._container.data('canAdd')) {
			this._initAddComment();
		}
		
		WCF.DOMNodeInsertedHandler.execute();
		WCF.DOMNodeInsertedHandler.addCallback('WCF.Comment.Handler', $.proxy(this._domNodeInserted, this));
	},
	
	/**
	 * Shows a button to load next comments.
	 */
	_handleLoadNextComments: function() {
		if (this._displayedComments < this._container.data('comments')) {
			if (this._loadNextComments === null) {
				this._loadNextComments = $('<li class="commentLoadNext"><button class="small">' + WCF.Language.get('wcf.comment.more') + '</button></li>').appendTo(this._container);
				this._loadNextComments.children('button').click($.proxy(this._loadComments, this));
			}
			
			this._loadNextComments.children('button').enable();
		}
		else if (this._loadNextComments !== null) {
			this._loadNextComments.hide();
		}
	},
	
	/**
	 * Shows a button to load next responses per comment.
	 * 
	 * @param	integer		commentID
	 */
	_handleLoadNextResponses: function(commentID) {
		var $comment = this._comments[commentID];
		$comment.data('displayedResponses', $comment.find('ul.commentResponseList > li').length);
		
		if ($comment.data('displayedResponses') < $comment.data('responses')) {
			if (this._loadNextResponses[commentID] === undefined) {
				var $difference = $comment.data('responses') - $comment.data('displayedResponses');
				this._loadNextResponses[commentID] = $('<li class="jsCommentLoadNextResponses"><a>' + WCF.Language.get('wcf.comment.response.more', { count: $difference }) + '</a></li>').appendTo(this._commentButtonList[commentID]);
				this._loadNextResponses[commentID].children('a').data('commentID', commentID).click($.proxy(this._loadResponses, this));
				this._commentButtonList[commentID].parent().show();
			}
		}
		else if (this._loadNextResponses[commentID] !== undefined) {
			var $showAddResponse = this._loadNextResponses[commentID].next();
			this._loadNextResponses[commentID].remove();
			if ($showAddResponse.length) {
				$showAddResponse.trigger('click');
			}
		}
	},
	
	/**
	 * Loads next comments.
	 */
	_loadComments: function() {
		this._loadNextComments.children('button').disable();
		
		this._proxy.setOption('data', {
			actionName: 'loadComments',
			className: 'wcf\\data\\comment\\CommentAction',
			parameters: {
				data: {
					objectID: this._container.data('objectID'),
					objectTypeID: this._container.data('objectTypeID'),
					lastCommentTime: this._container.data('lastCommentTime')
				}
			}
		});
		this._proxy.sendRequest();
	},
	
	/**
	 * Loads next responses for given comment.
	 * 
	 * @param	object		event
	 */
	_loadResponses: function(event) {
		this._loadResponsesExecute($(event.currentTarget).disable().data('commentID'), false);
		
	},
	
	/**
	 * Executes loading of comments, optionally fetching all at once.
	 * 
	 * @param	integer		commentID
	 * @param	boolean		loadAllResponses
	 */
	_loadResponsesExecute: function(commentID, loadAllResponses) {
		this._proxy.setOption('data', {
			actionName: 'loadResponses',
			className: 'wcf\\data\\comment\\response\\CommentResponseAction',
			parameters: {
				data: {
					commentID: commentID,
					lastResponseTime: this._comments[commentID].data('lastResponseTime'),
					loadAllResponses: (loadAllResponses ? 1 : 0)
				}
			}
		});
		this._proxy.sendRequest();
	},
	
	/**
	 * Handles DOMNodeInserted events.
	 */
	_domNodeInserted: function() {
		this._initComments();
		this._initResponses();
	},
	
	/**
	 * Initializes available comments.
	 */
	_initComments: function() {
		var self = this;
		var $loadedComments = false;
		this._container.find('.jsComment').each(function(index, comment) {
			var $comment = $(comment).removeClass('jsComment');
			var $commentID = $comment.data('commentID');
			self._comments[$commentID] = $comment;
			
			var $insertAfter = $comment.find('ul.commentResponseList');
			if (!$insertAfter.length) $insertAfter = $comment.find('.commentContent');
			
			$container = $('<div class="commentOptionContainer" />').hide().insertAfter($insertAfter);
			self._commentButtonList[$commentID] = $('<ul />').appendTo($container);
			
			self._handleLoadNextResponses($commentID);
			self._initComment($commentID, $comment);
			self._displayedComments++;
			
			$loadedComments = true;
		});
		
		if ($loadedComments) {
			this._handleLoadNextComments();
		}
	},
	
	/**
	 * Initializes a specific comment.
	 * 
	 * @param	integer		commentID
	 * @param	jQuery		comment
	 */
	_initComment: function(commentID, comment) {
		if (this._container.data('canAdd')) {
			this._initAddResponse(commentID, comment);
		}
		
		if (comment.data('canEdit')) {
			var $editButton = $('<li><a class="jsTooltip" title="' + WCF.Language.get('wcf.global.button.edit') + '"><span class="icon icon16 icon-pencil" /> <span class="invisible">' + WCF.Language.get('wcf.global.button.edit') + '</span></a></li>');
			$editButton.data('commentID', commentID).appendTo(comment.find('ul.commentOptions:eq(0)')).click($.proxy(this._prepareEdit, this));
		}
		
		if (comment.data('canDelete')) {
			var $deleteButton = $('<li><a class="jsTooltip" title="' + WCF.Language.get('wcf.global.button.delete') + '"><span class="icon icon16 icon-remove" /> <span class="invisible">' + WCF.Language.get('wcf.global.button.delete') + '</span></a></li>');
			$deleteButton.data('commentID', commentID).appendTo(comment.find('ul.commentOptions:eq(0)')).click($.proxy(this._delete, this));
		}
	},
	
	/**
	 * Initializes available responses.
	 */
	_initResponses: function() {
		var self = this;
		this._container.find('.jsCommentResponse').each(function(index, response) {
			var $response = $(response).removeClass('jsCommentResponse');
			var $responseID = $response.data('responseID');
			self._responses[$responseID] = $response;
			
			self._initResponse($responseID, $response);
		});
	},
	
	/**
	 * Initializes a specific response.
	 * 
	 * @param	integer		responseID
	 * @param	jQuery		response
	 */
	_initResponse: function(responseID, response) {
		if (response.data('canEdit')) {
			var $editButton = $('<li><a class="jsTooltip" title="' + WCF.Language.get('wcf.global.button.edit') + '"><span class="icon icon16 icon-pencil" /> <span class="invisible">' + WCF.Language.get('wcf.global.button.edit') + '</span></a></li>');
			
			var self = this;
			$editButton.data('responseID', responseID).appendTo(response.find('ul.commentOptions:eq(0)')).click(function(event) { self._prepareEdit(event, true); });
		}
		
		if (response.data('canDelete')) {
			var $deleteButton = $('<li><a class="jsTooltip" title="' + WCF.Language.get('wcf.global.button.delete') + '"><span class="icon icon16 icon-remove" /> <span class="invisible">' + WCF.Language.get('wcf.global.button.delete') + '</span></a></li>');
			
			var self = this;
			$deleteButton.data('responseID', responseID).appendTo(response.find('ul.commentOptions:eq(0)')).click(function(event) { self._delete(event, true); });
		}
	},
	
	/**
	 * Initializes the UI components to add a comment.
	 */
	_initAddComment: function() {
		// create UI
		this._commentAdd = $('<li class="box32 jsCommentAdd"><span class="framed">' + this._userAvatar + '</span><div /></li>').prependTo(this._container);
		var $inputContainer = this._commentAdd.children('div');
		var $input = $('<input type="text" placeholder="' + WCF.Language.get('wcf.comment.add') + '" maxlength="65535" class="long" />').appendTo($inputContainer);
		$('<small>' + WCF.Language.get('wcf.comment.description') + '</small>').appendTo($inputContainer);
		
		$input.keyup($.proxy(this._keyUp, this));
	},
	
	/**
	 * Initializes the UI elements to add a response.
	 * 
	 * @param	integer		commentID
	 * @param	jQuery		comment
	 */
	_initAddResponse: function(commentID, comment) {
		var $placeholder = null;
		if (!comment.data('responses') || this._loadNextResponses[commentID]) {
			$placeholder = $('<li class="jsCommentShowAddResponse"><a>' + WCF.Language.get('wcf.comment.button.response.add') + '</a></li>').data('commentID', commentID).click($.proxy(this._showAddResponse, this)).appendTo(this._commentButtonList[commentID]);
		}
		
		var $listItem = $('<div class="box32 commentResponseAdd jsCommentResponseAdd"><span class="framed">' + this._userAvatar + '</span><div /></div>');
		if ($placeholder !== null) {
			$listItem.hide();
		}
		else {
			this._commentButtonList[commentID].parent().addClass('jsAddResponseActive');
		}
		$listItem.appendTo(this._commentButtonList[commentID].parent().show());
		
		var $inputContainer = $listItem.children('div');
		var $input = $('<input type="text" placeholder="' + WCF.Language.get('wcf.comment.response.add') + '" maxlength="65535" class="long" />').data('commentID', commentID).appendTo($inputContainer);
		$('<small>' + WCF.Language.get('wcf.comment.description') + '</small>').appendTo($inputContainer);
		
		var self = this;
		$input.keyup(function(event) { self._keyUp(event, true); });
		
		comment.data('responsePlaceholder', $placeholder).data('responseInput', $listItem);
	},
	
	/**
	 * Prepares editing of a comment or response.
	 * 
	 * @param	object		event
	 * @param	boolean		isResponse
	 */
	_prepareEdit: function(event, isResponse) {
		var $button = $(event.currentTarget);
		var $data = {
			objectID: this._container.data('objectID'),
			objectTypeID: this._container.data('objectTypeID')
		};
		
		if (isResponse === true) {
			$data.responseID = $button.data('responseID');
		}
		else {
			$data.commentID = $button.data('commentID');
		}
		
		this._proxy.setOption('data', {
			actionName: 'prepareEdit',
			className: 'wcf\\data\\comment\\CommentAction',
			parameters: {
				data: $data
			}
		});
		this._proxy.sendRequest();
	},
	
	/**
	 * Displays the UI elements to create a response.
	 * 
	 * @param	object		event
	 */
	_showAddResponse: function(event) {
		var $placeholder = $(event.currentTarget);
		var $commentID = $placeholder.data('commentID');
		if ($placeholder.prev().hasClass('jsCommentLoadNextResponses')) {
			this._loadResponsesExecute($commentID, true);
			$placeholder.parent().children('.button').disable();
		}
		
		$placeholder.remove();
		
		var $responseInput = this._comments[$commentID].data('responseInput').show();
		$responseInput.find('input').focus();
		
		$responseInput.parents('.commentOptionContainer').addClass('jsAddResponseActive');
	},
	
	/**
	 * Handles the keyup event for comments and responses.
	 * 
	 * @param	object		event
	 * @param	boolean		isResponse
	 */
	_keyUp: function(event, isResponse) {
		// ignore every key except for [Enter] and [Esc]
		if (event.which !== 13 && event.which !== 27) {
			return;
		}
		
		var $input = $(event.currentTarget);
		
		// cancel input
		if (event.which === 27) {
			$input.val('').trigger('blur', event);
			return;
		}
		
		var $value = $.trim($input.val());
		
		// ignore empty comments
		if ($value == '') {
			return;
		}
		
		var $actionName = 'addComment';
		var $data = {
			message: $value,
			objectID: this._container.data('objectID'),
			objectTypeID: this._container.data('objectTypeID')
		};
		if (isResponse === true) {
			$actionName = 'addResponse';
			$data.commentID = $input.data('commentID');
		}
		
		if (!WCF.User.userID) {
			this._commentData = $data;
			
			// check if guest dialog has already been loaded
			if (this._guestDialog === null) {
				this._proxy.setOption('data', {
					actionName: 'getGuestDialog',
					className: 'wcf\\data\\comment\\CommentAction',
					parameters: {
						data: {
							message: $value,
							objectID: this._container.data('objectID'),
							objectTypeID: this._container.data('objectTypeID')
						}
					}
				});
				this._proxy.sendRequest();
			}
			else {
				// request a new recaptcha
				if (this._useRecaptcha) {
					Recaptcha.reload();
				}
				
				this._guestDialog.find('input[type="submit"]').enable();
				
				this._guestDialog.wcfDialog('open');
			}
		}
		else {
			this._proxy.setOption('data', {
				actionName: $actionName,
				className: 'wcf\\data\\comment\\CommentAction',
				parameters: {
					data: $data
				}
			});
			this._proxy.sendRequest();
		}
	},
	
	/**
	 * Shows a confirmation message prior to comment or response deletion.
	 * 
	 * @param	object		event
	 * @param	boolean		isResponse
	 */
	_delete: function(event, isResponse) {
		WCF.System.Confirmation.show(WCF.Language.get('wcf.comment.delete.confirmMessage'), $.proxy(function(action) {
			if (action === 'confirm') {
				var $data = {
					objectID: this._container.data('objectID'),
					objectTypeID: this._container.data('objectTypeID')
				};
				if (isResponse !== true) {
					$data.commentID = $(event.currentTarget).data('commentID');
				}
				else {
					$data.responseID = $(event.currentTarget).data('responseID');
				}
				
				this._proxy.setOption('data', {
					actionName: 'remove',
					className: 'wcf\\data\\comment\\CommentAction',
					parameters: {
						data: $data
					}
				});
				this._proxy.sendRequest();
			}
		}, this));
	},
	
	/**
	 * Handles a failed AJAX request.
	 * 
	 * @param	object		data
	 * @param	object		jqXHR
	 * @param	string		textStatus
	 * @param	string		errorThrown
	 * @return	boolean
	 */
	_failure: function(data, jqXHR, textStatus, errorThrown) {
		if (!WCF.User.userID && this._guestDialog) {
			// enable submit button again
			this._guestDialog.find('input[type="submit"]').enable();
		}
		
		return true;
	},
	
	/**
	 * Handles successful AJAX requests.
	 * 
	 * @param	object		data
	 * @param	string		textStatus
	 * @param	jQuery		jqXHR
	 */
	_success: function(data, textStatus, jqXHR) {
		switch (data.actionName) {
			case 'addComment':
				if (data.returnValues.errors) {
					this._handleGuestDialogErrors(data.returnValues.errors);
				}
				else {
					this._commentAdd.find('input').val('').blur();
					$(data.returnValues.template).insertAfter(this._commentAdd).wcfFadeIn();
					
					if (!WCF.User.userID) {
						this._guestDialog.wcfDialog('close');
					}
				}
			break;
			
			case 'addResponse':
				if (data.returnValues.errors) {
					this._handleGuestDialogErrors(data.returnValues.errors);
				}
				else {
					var $comment = this._comments[data.returnValues.commentID];
					$comment.find('.jsCommentResponseAdd input').val('').blur();
					
					var $responseList = $comment.find('ul.commentResponseList');
					if (!$responseList.length) $responseList = $('<ul class="commentResponseList" />').insertBefore($comment.find('.commentOptionContainer'));
					$(data.returnValues.template).appendTo($responseList).wcfFadeIn();
				}
				
				if (!WCF.User.userID) {
					this._guestDialog.wcfDialog('close');
				}
			break;
			
			case 'edit':
				this._update(data);
			break;
			
			case 'loadComments':
				this._insertComments(data);
			break;
			
			case 'loadResponses':
				this._insertResponses(data);
			break;
			
			case 'prepareEdit':
				this._edit(data);
			break;
			
			case 'remove':
				this._remove(data);
			break;
			
			case 'getGuestDialog':
				this._createGuestDialog(data);
			break;
		}
		
		WCF.DOMNodeInsertedHandler.execute();
	},
	
	/**
	 * Inserts previously loaded comments.
	 * 
	 * @param	object		data
	 */
	_insertComments: function(data) {
		// insert comments
		$(data.returnValues.template).insertBefore(this._loadNextComments);
		
		// update time of last comment
		this._container.data('lastCommentTime', data.returnValues.lastCommentTime);
	},
	
	/**
	 * Inserts previously loaded responses.
	 * 
	 * @param	object		data
	 */
	_insertResponses: function(data) {
		var $comment = this._comments[data.returnValues.commentID];
		
		// insert responses
		$(data.returnValues.template).appendTo($comment.find('ul.commentResponseList'));
		
		// update time of last response
		$comment.data('lastResponseTime', data.returnValues.lastResponseTime);
		
		// update button state to load next responses
		this._handleLoadNextResponses(data.returnValues.commentID);
	},
	
	/**
	 * Removes a comment or response from list.
	 * 
	 * @param	object		data
	 */
	_remove: function(data) {
		if (data.returnValues.commentID) {
			this._comments[data.returnValues.commentID].remove();
			delete this._comments[data.returnValues.commentID];
		}
		else {
			this._responses[data.returnValues.responseID].remove();
			delete this._responses[data.returnValues.responseID];
		}
	},
	
	/**
	 * Prepares editing of a comment or response.
	 * 
	 * @param	object		data
	 */
	_edit: function(data) {
		if (data.returnValues.commentID) {
			var $content = this._comments[data.returnValues.commentID].find('.commentContent:eq(0) .userMessage:eq(0)');
		}
		else {
			var $content = this._responses[data.returnValues.responseID].find('.commentContent:eq(0) .userMessage:eq(0)');
		}
		
		// replace content with input field
		$content.html($.proxy(function(index, oldHTML) {
			var $input = $('<input type="text" class="long" maxlength="65535" /><small>' + WCF.Language.get('wcf.comment.description') + '</small>').val(data.returnValues.message);
			$input.data('__html', oldHTML).keyup($.proxy(this._saveEdit, this));
			
			if (data.returnValues.commentID) {
				$input.data('commentID', data.returnValues.commentID);
			}
			else {
				$input.data('responseID', data.returnValues.responseID);
			}
			
			return $input;
		}, this));
		$content.children('input').focus();
		
		// hide elements
		$content.parent().find('.containerHeadline:eq(0)').hide();
		$content.parent().find('.buttonGroupNavigation:eq(0)').hide();
	},
	
	/**
	 * Updates a comment or response.
	 * 
	 * @param	object		data
	 */
	_update: function(data) {
		if (data.returnValues.commentID) {
			var $input = this._comments[data.returnValues.commentID].find('.commentContent:eq(0) .userMessage:eq(0) > input');
		}
		else {
			var $input = this._responses[data.returnValues.responseID].find('.commentContent:eq(0) .userMessage:eq(0) > input');
		}
		
		$input.data('__html', data.returnValues.message);
		
		this._cancelEdit($input);
	},
	
	/**
	 * Creates the guest dialog based on the given return data from the AJAX
	 * request.
	 * 
	 * @param	object		data
	 */
	_createGuestDialog: function(data) {
		this._guestDialog = $('<div id="commentAddGuestDialog" />').append(data.returnValues.template).hide().appendTo(document.body);
		
		// bind submit event listeners
		this._guestDialog.find('input[type="submit"]').click($.proxy(this._submit, this));

		this._guestDialog.find('input[type="text"]').keydown($.proxy(this._keyDown, this));

		// check if recaptcha is used
		this._useRecaptcha = this._guestDialog.find('dl.reCaptcha').length > 0;
		
		this._guestDialog.wcfDialog({
			'title': WCF.Language.get('wcf.comment.guestDialog.title')
		});
	},

	/**
	 * Handles clicking enter in the input fields of the guest dialog by
	 * submitting it.
	 * 
	 * @param	Event		event
	 */
	_keyDown: function(event) {
		if (event.which === $.ui.keyCode.ENTER) {
			this._submit();
		}
	},

	/**
	 * Handles errors during creation of a comment or response due to the input
	 * in the guest dialog.
	 * 
	 * @param	object		errors
	 */
	_handleGuestDialogErrors: function(errors) {
		if (errors.username) {
			var $usernameInput = this._guestDialog.find('input[name="username"]');
			var $errorMessage = $usernameInput.next('.innerError');
			if (!$errorMessage.length) {
				$errorMessage = $('<small class="innerError" />').text(errors.username).insertAfter($usernameInput);
			}
			else {
				$errorMessage.text(errors.username).show();
			}
		}
		
		if (errors.recaptcha) {
			Recaptcha.reload();

			var $recaptchaInput = this._guestDialog.find('input[name="recaptcha_response_field"]');
			var $errorMessage = $recaptchaInput.next('.innerError');
			if (!$errorMessage.length) {
				$errorMessage = $('<small class="innerError" />').text(errors.recaptcha).insertAfter($recaptchaInput);
			}
			else {
				$errorMessage.text(errors.recaptcha).show();
			}
		}

		this._guestDialog.find('input[type="submit"]').enable();
	},
	
	/**
	 * Handles submitting the guest dialog.
	 * 
	 * @param	Event		event
	 */
	_submit: function(event) {
		var $submit = true;

		this._guestDialog.find('input[type="submit"]').enable();

		// validate username
		var $usernameInput = this._guestDialog.find('input[name="username"]');
		var $username = $usernameInput.val();
		var $usernameErrorMessage = $usernameInput.next('.innerError');
		if (!$username) {
			$submit = false;
			if (!$usernameErrorMessage.length) {
				$usernameErrorMessage = $('<small class="innerError" />').text(WCF.Language.get('wcf.global.form.error.empty')).insertAfter($usernameInput);
			}
			else {
				$usernameErrorMessage.text(WCF.Language.get('wcf.global.form.error.empty')).show();
			}
		}

		// validate recaptcha
		if (this._useRecaptcha) {
			var $recaptchaInput = this._guestDialog.find('input[name="recaptcha_response_field"]');
			var $recaptchaResponse = $recaptchaInput.val();
			var $recaptchaErrorMessage = $recaptchaInput.next('.innerError');
			if (!$recaptchaResponse) {
				$submit = false;
				if (!$recaptchaErrorMessage.length) {
					$recaptchaErrorMessage = $('<small class="innerError" />').text(WCF.Language.get('wcf.global.form.error.empty')).insertAfter($recaptchaInput);
				}
				else {
					$recaptchaErrorMessage.text(WCF.Language.get('wcf.global.form.error.empty')).show();
				}
			}
		}

		if ($submit) {
			if ($usernameErrorMessage.length) {
				$usernameErrorMessage.hide();
			}

			if (this._useRecaptcha && $recaptchaErrorMessage.length) {
				$recaptchaErrorMessage.hide();
			}

			var $data = this._commentData;
			$data.username = $username;

			var $parameters = {
				data: $data
			};

			if (this._useRecaptcha) {
				$parameters.recaptchaChallenge = Recaptcha.get_challenge();
				$parameters.recaptchaResponse = Recaptcha.get_response();
			}
			
			this._proxy.setOption('data', {
				actionName: this._commentData.commentID ? 'addResponse' : 'addComment',
				className: 'wcf\\data\\comment\\CommentAction',
				parameters: $parameters
			});
			this._proxy.sendRequest();

			this._guestDialog.find('input[type="submit"]').disable();
		}
	},
	
	/**
	 * Saves editing of a comment or response.
	 * 
	 * @param	object		event
	 */
	_saveEdit: function(event) {
		var $input = $(event.currentTarget);
		
		// abort with [Esc]
		if (event.which === 27) {
			this._cancelEdit($input);
			return;
		}
		else if (event.which !== 13) {
			// ignore everything except for [Enter]
			return;
		}
		
		var $message = $.trim($input.val());
		
		// ignore empty message
		if ($message === '') {
			return;
		}
		
		var $data = {
			message: $message,
			objectID: this._container.data('objectID'),
			objectTypeID: this._container.data('objectTypeID')
		};
		if ($input.data('commentID')) {
			$data.commentID = $input.data('commentID');
		}
		else {
			$data.responseID = $input.data('responseID');
		}
		
		this._proxy.setOption('data', {
			actionName: 'edit',
			className: 'wcf\\data\\comment\\CommentAction',
			parameters: {
				data: $data
			}
		});
		this._proxy.sendRequest()
	},
	
	/**
	 * Cancels editing of a comment or response.
	 * 
	 * @param	jQuery		input
	 */
	_cancelEdit: function(input) {
		// restore elements
		input.parent().prev('.containerHeadline:eq(0)').show();
		input.parent().next('.buttonGroupNavigation:eq(0)').show();
		
		// restore HTML
		input.parent().html(input.data('__html'));
	}
});

/**
 * Like support for comments
 * 
 * @see	WCF.Like
 */
WCF.Comment.Like = WCF.Like.extend({
	/**
	 * @see	WCF.Like._getContainers()
	 */
	_getContainers: function() {
		return $('.commentList > li.comment');
	},
	
	/**
	 * @see	WCF.Like._getObjectID()
	 */
	_getObjectID: function(containerID) {
		return this._containers[containerID].data('commentID');
	},
	
	/**
	 * @see	WCF.Like._buildWidget()
	 */
	_buildWidget: function(containerID, likeButton, dislikeButton, badge, summary) {
		this._containers[containerID].find('.containerHeadline:eq(0) > h3').append(badge);
		
		if (this._canLike) {
			likeButton.appendTo(this._containers[containerID].find('.commentOptions:eq(0)'));
			dislikeButton.appendTo(this._containers[containerID].find('.commentOptions:eq(0)'));
		}
	},
	
	/**
	 * @see	WCF.Like._getWidgetContainer()
	 */
	_getWidgetContainer: function(containerID) {},
	
	/**
	 * @see	WCF.Like._addWidget()
	 */
	_addWidget: function(containerID, widget) {}
});

/**
 * Namespace for comment responses
 */
WCF.Comment.Response = { };

/**
 * Like support for comments responses.
 * 
 * @see	WCF.Like
 */
WCF.Comment.Response.Like = WCF.Like.extend({
	/**
	 * @see	WCF.Like._addWidget()
	 */
	_addWidget: function(containerID, widget) { },
	
	/**
	 * @see	WCF.Like._buildWidget()
	 */
	_buildWidget: function(containerID, likeButton, dislikeButton, badge, summary) {
		this._containers[containerID].find('.containerHeadline:eq(0) > h3').append(badge);
		
		if (this._canLike) {
			likeButton.appendTo(this._containers[containerID].find('.commentOptions:eq(0)'));
			dislikeButton.appendTo(this._containers[containerID].find('.commentOptions:eq(0)'));
		}
	},
	
	/**
	 * @see	WCF.Like._getContainers()
	 */
	_getContainers: function() {
		return $('.commentResponseList > li.commentResponse');
	},
	
	/**
	 * @see	WCF.Like._getObjectID()
	 */
	_getObjectID: function(containerID) {
		return this._containers[containerID].data('responseID');
	},
	
	/**
	 * @see	WCF.Like._getWidgetContainer()
	 */
	_getWidgetContainer: function(containerID) { }
});
