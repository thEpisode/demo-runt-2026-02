const SecurityAuthPasswordService = require('./security/auth-password/auth-password.service');
const RemoteApiService = require('./remote-api/remote-api.service');
const ApiManagerService = require('./api-manager/api-manager.service');
const HealthService = require('./health/health.service');
const UploadService = require('./upload/upload.service');

const DeviceService = require('./device/device-management/device-management.service');
const NotificationService = require('./notification/notification-management/notification-management.service');
const UserService = require('./user/user-management/user-management.service');

const HelloService = require('./hello/hello.service');

const ReportingQueryCatalogService = require('./reporting/query-catalog/query-catalog.service');
const ReportingQueryCompilerService = require('./reporting/query-compiler/query-compiler.service');
const ReportingNaturalQueryService = require('./reporting/natural-query/natural-query.service');

const Template = require('./_template/_template.service');

module.exports = {
  SecurityAuthPasswordService,
  RemoteApiService,
  DeviceService,
  NotificationService,
  ApiManagerService,
  HealthService,
  UploadService,
  UserService,
  HelloService,
  ReportingQueryCatalogService,
  ReportingQueryCompilerService,
  ReportingNaturalQueryService,
  Template,
};
