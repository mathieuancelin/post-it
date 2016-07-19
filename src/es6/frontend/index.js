import { ipcRenderer, clipboard } from 'electron';
import showdown from 'showdown';
import React from 'react';
import ReactDOM from 'react-dom';

const Styles = {
  textarea: {
    width: '100%',
    height: '100%',
    color: 'rgb(171, 178, 191)',
    backgroundColor: 'rgb(40, 44, 52)'
  },
  viewer: {
    width: '100%',
    height: '100%',
    color: 'rgb(171, 178, 191)',
    backgroundColor: 'rgb(40, 44, 52)'
  }
};

showdown.setOption('optionKey', 'value');

const converter = new showdown.Converter({
  parseImgDimensions: true,
  simplifiedAutoLink: true,
  strikethrough: true,
  tables: true,
  tasklists: true,
});

const MarkdownEditor = React.createClass({
  getInitialState() {
    this.stack = [];
    this.lastSave = 0;
    return {
      text: this.props.text
    };
  },
  componentDidMount() {
    this.textareaRef.focus();
  },
  showViewer() {
    this.props.showViewer();
  },
  save() {
    this.props.updateText(this.state.text);
    this.showViewer();
    ipcRenderer.send('save-content-to-file', { text: this.state.text });
  },
  getPreviousStateBackFromStack() {
    let last = this.stack.pop();
    if (last) {
      this.setState({ text: last });
    }
  },
  saveCurrentStateToStack(force) {
    if (force || (Date.now() - this.lastSave > 400)) {
      this.stack.push(this.state.text);
      this.lastSave = Date.now();
    }
  },
  selectAll() {
    this.textareaRef.focus();
    this.textareaRef.select();
  },
  cut() {
    let startPos = this.textareaRef.selectionStart;
    let endPos = this.textareaRef.selectionEnd;
    let selected = this.textareaRef.value.substring(startPos, endPos);
    clipboard.writeText(selected);
    this.textareaRef.value = this.textareaRef.value.substring(0, startPos)
        + this.textareaRef.value.substring(endPos, this.textareaRef.value.length);
    this.saveCurrentStateToStack(true);
    this.setState({ text: this.textareaRef.value }, () => {
      this.textareaRef.selectionStart = startPos;
      this.textareaRef.selectionEnd = startPos;
    });
  },
  copy() {
    let startPos = this.textareaRef.selectionStart;
    let endPos = this.textareaRef.selectionEnd;
    let selected = this.textareaRef.value.substring(startPos, endPos);
    clipboard.writeText(selected);
  },
  paste() {
    let startPos = this.textareaRef.selectionStart;
    let endPos = this.textareaRef.selectionEnd;
    let selected = clipboard.readText();
    this.textareaRef.value = this.textareaRef.value.substring(0, startPos)
        + selected
        + this.textareaRef.value.substring(endPos, this.textareaRef.value.length);
    this.saveCurrentStateToStack(true);
    this.setState({ text: this.textareaRef.value }, () => {
      this.textareaRef.selectionStart = endPos + selected.length;
      this.textareaRef.selectionEnd = endPos + selected.length;
    });
  },
  handleChange(e) {
    this.saveCurrentStateToStack();
    this.setState({ text: e.target.value });
  },
  handleClick(e) {
    if (e.keyCode && e.keyCode === 16) {
      e.preventDefault();
      let start = this.textareaRef.selectionStart;
      setTimeout(() => {
        this.textareaRef.selectionStart = start;
        this.textareaRef.selectionEnd = this.textareaRef.selectionEnd;
      });
    }
  },
  handleKeyUp() {
    this.selectStart = null;
  },
  handleKeyDown(e) {
    if (e.keyCode === 27) { // esc
      this.showViewer();
    }
    if (e.metaKey || e.ctrlKey) {
      if (e.keyCode === 83) { // s
        this.save();
      }
      if (e.keyCode === 90) { // z
        this.getPreviousStateBackFromStack();
      }
      if (e.keyCode === 65) { // a
        e.preventDefault();
        this.selectAll();
      }
      if (e.keyCode === 88) { // x
        e.preventDefault();
        this.cut();
      }
      if (e.keyCode === 67) { // c
        e.preventDefault();
        this.copy();
      }
      if (e.keyCode === 86) { // v
        e.preventDefault();
        this.paste();
      }
    }
  },
  render() {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <textarea
          ref={(ref) => this.textareaRef = ref}
          onKeyDown={this.handleKeyDown} 
          onKeyUp={this.handleKeyUpd} 
          onClick={this.handleClick} 
          style={Styles.textarea}
          onChange={this.handleChange}
          value={this.state.text}></textarea>
      </div>
    );
  }
});

const MarkdownViewer = React.createClass({
  showEditor() {
    this.props.showEditor();
  },
  copy() {
    let startPos = this.spanRef.selectionStart;
    let endPos = this.spanRef.selectionEnd;
    let selected = this.spanRef.value.substring(startPos, endPos);
    clipboard.writeText(selected);
  },
  handleKeyDown(e) {
    if (e.metaKey || e.ctrlKey) {
      if (e.keyCode === 69) {
        this.showEditor();
      }
      if (e.keyCode === 67) { // c
        e.preventDefault();
        this.copy();
      }
    }
  },
  render() {
    const html = converter.makeHtml(this.props.text);
    return (
      <div id="viewer" ref={(ref) => this.spanRef = ref} onKeyDown={this.handleKeyDown} onDoubleClick={this.showEditor} style={Styles.viewer}>
        <span dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }
});

const MarkdownPostIt = React.createClass({
  getInitialState() {
    return {
      edition: false,
      text: this.fetchText(),
    };
  },
  updateText(text) {
    localStorage.setItem('postit-text', text);
  },
  fetchText() {
    return localStorage.getItem('postit-text') || '# Hello PostIt !';
  },
  showEditor() {
    const text = this.fetchText();
    this.setState({ edition: true, text });
  },
  showViewer() {
    const text = this.fetchText();
    this.setState({ edition: false, text });
  },
  render() {
    if (this.state.edition) {
      return <MarkdownEditor
        text={this.state.text}
        updateText={this.updateText}
        fetchText={this.fetchText}
        showViewer={this.showViewer} />
    } else {
      return <MarkdownViewer
        text={this.state.text}
        showEditor={this.showEditor} />
    }
  }
});

function init(initalText) {
  if (initalText) {
    localStorage.setItem('postit-text', initalText)
  }
  ReactDOM.render(<MarkdownPostIt />, document.getElementById('app'));
}

ipcRenderer.on('lifecycle-event', (sender, message) => {
  if (message.event === 'init') {
    init(message.initalText);
  }
});
