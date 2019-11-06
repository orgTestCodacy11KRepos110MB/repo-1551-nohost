import $ from 'jquery';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { parse } from 'query-string';
import ClipboardJS from 'clipboard';
import { Cascader, Button, Modal, Input, Checkbox, Icon, message } from 'antd';
import QRCode from '../components/QRCode';
import Upload from '../components/Upload';
import { getAllAccounts, getFollower, unfollow } from '../cgi';
import '../base.less';
import './index.css';

const ButtonGroup = Button.Group;
const { search, href } = window.location;
const query = parse(search);
const PREFIX_LEN = 'x-nohost-'.length;
const URL_DIR = href.replace(/[^/]+([?#].*)?$/, '');
const REDIRECT_URL = `${URL_DIR.replace(/:\d+/, '')}redirect`;
const { tab } = query;
let pageName;

if (['network', 'rules', 'values', 'plugins'].indexOf(tab) !== -1) {
  pageName = `#${tab}`;
} else {
  pageName = (query.name && !query.env) ? '#rules' : '#network';
}

window.onWhistlePageChange = name => (pageName = `#${name}`);

const clipboard = new ClipboardJS('.n-copy-btn');

clipboard.on('success', (e) => {
  message.success('复制成功');
  e.clearSelection();
});

clipboard.on('error', () => {
  message.error('复制失败');
});

const getRedirectUrl = (value, url) => {
  value = value || [];
  value = value.filter(v => v);
  value = value.map((val, i) => {
    val = encodeURIComponent(val);
    if (i) {
      return `env=${val}`;
    }
    return `name=${val}`;
  });
  if (url) {
    if (!/^https?:\/\//.test(url)) {
      url = `${/^\/\//.test(url) ? 'http:' : 'http://'}${url}`;
    }
    value.push(`url=${encodeURIComponent(url)}`);
  }
  return value.length ? `${REDIRECT_URL}?${value.join('&')}` : REDIRECT_URL;
};

const formatRules = (data) => {
  let { rules, headers } = data;
  headers = Object.keys(headers).map((name) => {
    return `${name.substring(PREFIX_LEN)}: ${headers[name]}`;
  }).join('\n');
  const result = [];
  if (headers) {
    result.push(`# nohost配置\n${headers}`);
  }
  if (rules) {
    result.push(`# whistle规则\n${rules}`);
  }
  return result.join('\n\n');
};

$(window).on('blur', () => {
  try {
    const evt = document.createEvent('MouseEvents');
    evt.initMouseEvent('mousedown', true, true, window);
    document.dispatchEvent(evt);
  } catch (e) {}
});

const getUrl = (name, envName) => {
  if (!name) {
    return;
  }
  const own = `?ip=${localStorage.viewOwn ? 'self' : ''}${envName ? `&ruleName=${encodeURIComponent(envName)}` : ''}`;
  let url = `account/${name}/index.html?${pageName}${own}`;
  if (envName) {
    const env = encodeURIComponent(`${name}/${envName.trim() || ''}`);
    url = `${url}&name=x-whistle-nohost-env&value=${env}&mtype=exact`;
  }
  return url;
};
/* eslint-disable react/no-access-state-in-setstate */
class Capture extends Component {
  state = {}

  componentDidMount() {
    this.loadData();
    let timer;
    const debounce = () => {
      clearTimeout(timer);
      timer = setTimeout(this.loadData, 5000);
    };
    window.onWhistleRulesChange = debounce;
    window.onWhistleReady = debounce;
  }

  onChange = (value) => {
    if (!value.length) {
      const { curEnv } = this.envData || '';
      if (curEnv) {
        value.push(curEnv.name);
        value.push(curEnv.envName || '');
      }
    }
    localStorage.curEnvValue = JSON.stringify(value);
    this.setState({
      value,
      url: getUrl(value[0], value[1]),
    });
  }

  onEnvChange = (envValue) => {
    this.setState({
      envValue,
      redirectUrl: getRedirectUrl(envValue, this.state.testUrl),
    });
  }

  onTestUrlBlur = () => {
    const { envValue, testUrl } = this.state;
    this.setState({
      redirectUrl: getRedirectUrl(envValue, testUrl),
    });
  }

  onTestUrlChange = (e) => {
    clearTimeout(this.timer);
    const testUrl = e.target.value;
    const { envValue } = this.state;
    this.timer = setTimeout(() => {
      this.setState({ redirectUrl: getRedirectUrl(envValue, testUrl) });
    }, 600);
    this.setState({ testUrl });
  };

  getEnvValue(envMap, curEnv) {
    const formatEnvValue = (name, envName) => {
      if (!name || !envMap[name]) {
        return;
      }
      const value = [name, ''];
      if (envName && envMap[`${name}/${envName}`]) {
        value[1] = envName;
      }
      return value;
    };
    let result = formatEnvValue(query.name, query.env);
    if (result) {
      return result;
    }
    const { name, envName } = curEnv || '';
    result = formatEnvValue(name, envName);
    try {
      const localEnv = JSON.parse(localStorage.curEnvValue) || [];
      result = formatEnvValue(...localEnv) || result;
    } catch (e) {}
    return result;
  }

  initHints = (data) => {
    const list = [];
    const rulesMap = {};
    data.list.forEach(({ name, envList }) => {
      list.push(name);
      envList.forEach((env) => {
        const envName = `${name}/${env.name}`;
        rulesMap[envName] = env.rules;
        list.push(envName);
      });
    });
    window.getAtValueListForWhistle = (keyword) => {
      keyword = keyword && keyword.trim();
      if (!keyword) {
        return list;
      }
      keyword = keyword.toLowerCase();
      const result = list.filter(name => name.toLowerCase().indexOf(keyword) !== -1);
      result.sort((cur, next) => {
        const curIndex = cur.toLowerCase().indexOf(keyword);
        const nextIndex = next.toLowerCase().indexOf(keyword);
        if (curIndex === nextIndex) {
          return 0;
        }
        return curIndex > nextIndex ? 1 : -1;
      });
      return result;
    };
    const getEnvName = (name, url) => {
      url = url.replace(/\/[^/]*([?#].*)?$/, '');
      const accountName = url.substring(url.lastIndexOf('/') + 1);
      return `${accountName}/${name}`;
    };
    const getAtHelpUrlForWhistle = (name, options) => {
      if (options && options.name === 'Default') {
        return;
      }
      if (!/\//.test(name)) {
        name = getEnvName(options.name, options.url);
      }
      let rules = rulesMap[name];
      if (!rules) {
        message.error(`"${name}"不存在或已被删除！`);
        return false;
      }
      rules = formatRules(rules);
      if (!rules) {
        message.info(`"${name}"配置为空！`);
        return false;
      }
      this.setState({ rules, showRules: true, envName: name });
      return false;
    };
    window.getAtHelpUrlForWhistle = getAtHelpUrlForWhistle;
    window.onWhistleRulesEditorKeyDown = (e, { name, url }) => {
      const { keyCode } = e;
      if (keyCode === 13 || keyCode === 27) {
        this.setState({
          showRules: false,
          rules: '',
        });
        return;
      }
      if (name === 'Default' || !(e.ctrlKey || e.metaKey) || keyCode !== 112) {
        return;
      }
      getAtHelpUrlForWhistle(getEnvName(name, url));
      return false;
    };
  }

  loadData = () => {
    getAllAccounts((data) => {
      const envMap = {};
      const options = data.list.map((user) => {
        envMap[user.name] = 1;
        const children = user.envList.map(({ name }) => {
          envMap[`${user.name}/${name}`] = 1;
          return {
            label: name,
            value: name,
          };
        });
        children.unshift({
          label: 'All',
          value: '',
        }, {
          label: '默认环境',
          value: ' ',
        });
        return {
          label: user.name,
          value: user.name,
          children,
        };
      });
      const state = { options };
      if (!this.state.options) {
        state.viewOwn = localStorage.viewOwn === '1';
        const value = this.getEnvValue(envMap, data.curEnv);
        state.value = value;
        if (value) {
          state.url = getUrl(value[0], value[1]);
        }
        state.envValue = value;
        state.redirectUrl = getRedirectUrl(value);
      }
      this.setState(state);
      this.initHints(data);
      this.envData = data;
      if (!window.getNohostEnvData) {
        window.getNohostEnvData = cb => (cb && cb(this.envData));
      }
    });
  }

  showQRCode = () => {
    this.setState({ showQRCode: true, qrCode: undefined });
    this.loadQRCode();
  }

  loadQRCode = () => {
    this.setState({ loadQRCodeError: false, followerIp: undefined });
    getFollower((data) => {
      if (!data) {
        this.setState({ loadQRCodeError: true });
        return;
      }
      const qrCode = `${URL_DIR}follow?followIp=${data.clientIp}`;
      this.setState({ qrCode, followerIp: data.followerIp });
    });
  }

  confirmQRCode = () => {
    this.setState({ followerIp: undefined });
  }

  showSelectEnv = () => {
    this.setState({ showSelectEnv: true, envUrl: './' });
  }

  createTestEnv = () => {
    this.setState({ createTestEnv: true }, () => {
      setTimeout(this.focusInput, 200);
    });
  }

  hideDialog = () => {
    this.setState({
      showQRCode: false,
      showSelectEnv: false,
      createTestEnv: false,
      envUrl: undefined,
    });
  }

  handleMasker = (e) => {
    if (e.target.nodeName === 'TEXTAREA') {
      return;
    }
    this.setState({
      rules: '',
      showRules: false,
    });
  }

  viewOwn = (e) => {
    const { checked } = e.target;
    localStorage.viewOwn = checked ? '1' : '';
    const url = (this.state.url || '').replace(/\?ip=[^&]*/, checked ? '?ip=self' : '?ip=');
    this.setState({
      url,
      viewOwn: checked,
    });
  }

  focusInput = () => {
    if (!this.testUrlInput) {
      return;
    }
    this.testUrlInput.focus();
  }

  openRedirectUrl = () => {
    window.open(this.state.redirectUrl);
  }

  unfollow = () => {
    unfollow();
    this.confirmQRCode();
  }

  preventBlur(e) {
    if (e.target.nodeName === 'TEXTAREA') {
      return;
    }
    e.preventDefault();
  }

  stopPropagation(e) {
    e.stopPropagation();
  }

  /* eslint-disable no-script-url, jsx-a11y/anchor-is-valid */
  render() {
    const {
      options, value, viewOwn, rules, showRules, envName, envUrl, redirectUrl,
      showSelectEnv, showQRCode, qrCode, createTestEnv, followerIp,
    } = this.state;
    const envValue = this.state.envValue || value;
    let { url } = this.state;
    url = url && url.replace(/#\w*/, pageName);
    let qrCodeTips;
    if (!qrCode) {
      qrCodeTips = this.state.loadQRCodeError ? (
        <div className="n-qrcode-loading">
                二维码加载失败，请<a href="javascript:;">点击重试</a>
        </div>
      ) : (
        <div className="n-qrcode-loading">二维码加载中...</div>
      );
    }
    let qrcodeElem;
    if (qrCode) {
      if (followerIp) {
        qrcodeElem = (
          <div className="n-qrcode-warning">
            <p>本机已关联IP: <strong>{followerIp}</strong></p>
            <p>重新扫描会解除上述关系</p>
            <Button onClick={this.confirmQRCode} type="primary">我知道了</Button>
            <p className="n-unfollow">
              <a href="javascript:;" onClick={this.unfollow}>解除关联</a>
            </p>
          </div>
        );
      } else {
        qrcodeElem = <QRCode size="340" value={qrCode} />;
      }
    }
    return !options ? null : (
      <div className="container fill orient-vertical-box">
        <div
          style={{ display: showRules ? 'block' : 'none' }}
          className="n-masker"
          onMouseDown={this.preventBlur}
          onClick={this.handleMasker}
        >
          <div
            onClick={this.stopPropagation}
            className="n-card"
          >
            <div className="n-header">
              <h4>{`"${envName}"`} 的配置</h4>
            </div>
            <textarea readOnly value={rules} />
            <div className="n-footer">
              <Button
                onClick={this.handleMasker}
                size="small"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
        <Upload />
        <div className="action-bar">
          <Cascader
            onChange={this.onChange}
            options={options}
            value={value}
            placeholder="选择抓包环境"
            showSearch
          />
          <span className="view-self-only">
            <Checkbox onChange={this.viewOwn} checked={viewOwn}>
              只看本机请求
            </Checkbox>
            {viewOwn ? (
              <Icon
                onClick={this.showQRCode}
                style={{ cursor: 'pointer' }}
                title="点击扫描二维码将手机请求设置为本机请求"
                type="qrcode"
              />
            ) : undefined}
          </span>
          <ButtonGroup className="n-align-right">
            <Button disabled={!options} onClick={this.showSelectEnv}>切换本机环境</Button>
            <Button disabled={!options} onClick={this.createTestEnv}>生成测试环境</Button>
          </ButtonGroup>
        </div>
        <iframe title="抓包界面" className="fill capture-win" src={url} />
        <div
          style={{ display: url && 'none' }}
          className="empty-tips"
        >
          <Icon type="info-circle-o" /> 请先在页面左上角选择抓包环境
        </div>
        <Modal
          width={360}
          className="n-qrcode-dialog"
          visible={showQRCode}
          title="扫描二维码将手机请求设置为本机请求"
          footer={[
            <Button
              onClick={this.hideDialog}
            >
              Close
            </Button>,
          ]}
          onCancel={this.hideDialog}
        >
          {qrcodeElem}
          {qrCodeTips}
        </Modal>
        <Modal
          className="n-create-test-env-dialog"
          width={600}
          visible={createTestEnv}
          title="生成访问指定nohost环境的URL及二维码"
          footer={[
            <Button
              onClick={this.hideDialog}
            >
              Close
            </Button>,
          ]}
          onCancel={this.hideDialog}
        >
          <Input
            className="n-test-url"
            maxLength="320"
            placeholder="请输入页面的URL"
            onChange={this.onTestUrlChange}
            onBlur={this.onTestUrlBlur}
            ref={input => (this.testUrlInput = input)}
          />
          <Cascader
            onChange={this.onEnvChange}
            options={options}
            value={envValue}
            placeholder="选择nohost环境"
            showSearch
          />
          <fieldset>
            <legend>URL(直接访问可以切换到上述环境并跳转到测试页面)</legend>
            <div className="n-settings-bar">
              <ButtonGroup size="small">
                <Button onClick={this.openRedirectUrl}>打开URL</Button>
                <Button
                  className="n-copy-btn"
                  data-clipboard-text={redirectUrl}
                >复制URL
                </Button>
              </ButtonGroup>
            </div>
            <Input readOnly value={redirectUrl} />
          </fieldset>
          <fieldset className="n-test-env-qrcode">
            <legend>二维码(手机扫描可以直接切换到上述环境并跳转到测试页面)</legend>
            <div className="n-settings-bar">
              右键点击二维码复制图片
            </div>
            <QRCode size="300" value={redirectUrl} />
          </fieldset>
        </Modal>
        <Modal
          className="n-padding-0-dialog"
          visible={showSelectEnv}
          title="选择本机nohost环境"
          footer={[
            <Button
              onClick={this.hideDialog}
            >
              Close
            </Button>,
          ]}
          onCancel={this.hideDialog}
        >
          <iframe title="切换本机环境" className="n-select-env-win" src={envUrl} />
        </Modal>
      </div>
    );
  }
}

ReactDOM.render(<Capture />, document.getElementById('root'));
