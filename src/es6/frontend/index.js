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
}

const converter = new showdown.Converter();

// TODO : auto focus
const MarkdownEditor = React.createClass({
  getInitialState() {
    this.stack = [];
    return {
      text: this.props.text
    };
  },
  showViewer() {
    this.props.showViewer();
  },
  handleChange(e) {
    this.stack.push(this.state.text);
    this.setState({ text: e.target.value });
  },
  save() {
    this.props.updateText(this.state.text);
    this.showViewer();
    ipcRenderer.send('save-content-to-file', { text: this.state.text });
  },
  componentDidMount() {
    this.textareaRef.focus();
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
    if (e.keyCode === 16) {
      // this.selectStart = this.textareaRef.selectionStart;
    }
    if (e.metaKey || e.ctrlKey) {
      if (e.keyCode === 83) { // s
        this.save();
      }
      if (e.keyCode === 90) { // z
        let last = this.stack.pop();
        if (last) {
          this.setState({ text: last });
        }
      }
      if (e.keyCode === 65) { // a
        e.preventDefault();
        this.textareaRef.focus();
        this.textareaRef.select();
      }
      if (e.keyCode === 88) { // x
        e.preventDefault();
        let startPos = this.textareaRef.selectionStart;
        let endPos = this.textareaRef.selectionEnd;
        let selected = this.textareaRef.value.substring(startPos, endPos);
        clipboard.writeText(selected);
        this.textareaRef.value = this.textareaRef.value.substring(0, startPos)
            + this.textareaRef.value.substring(endPos, this.textareaRef.value.length);
        this.stack.push(this.state.text);
        this.setState({ text: this.textareaRef.value }, () => {
          this.textareaRef.selectionStart = startPos;
          this.textareaRef.selectionEnd = startPos;
        });
      }
      if (e.keyCode === 67) { // c
        e.preventDefault();
        let startPos = this.textareaRef.selectionStart;
        let endPos = this.textareaRef.selectionEnd;
        let selected = this.textareaRef.value.substring(startPos, endPos);
        clipboard.writeText(selected);
      }
      if (e.keyCode === 86) { // v
        e.preventDefault();
        let startPos = this.textareaRef.selectionStart;
        let endPos = this.textareaRef.selectionEnd;
        let selected = clipboard.readText();
        ipcRenderer.send('console.log', `in clipboard : ${selected}`);
        this.textareaRef.value = this.textareaRef.value.substring(0, startPos)
            + selected
            + this.textareaRef.value.substring(endPos, this.textareaRef.value.length);
        this.stack.push(this.state.text);
        this.setState({ text: this.textareaRef.value }, () => {
          this.textareaRef.selectionStart = endPos + selected.length;
          this.textareaRef.selectionEnd = endPos + selected.length;
        });
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
  handleKeyDown(e) {
    if (e.metaKey || e.ctrlKey) {
      if (e.keyCode === 69) {
        this.showEditor();
      }
    }
  },
  render() {
    const html = converter.makeHtml(this.props.text);
    return (
      <div id="viewer" onKeyDown={this.handleKeyDown} onDoubleClick={this.showEditor} style={Styles.viewer}>
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
