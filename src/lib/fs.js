'use strict'
/**
 * 
 * //
// Created by TD on 24-4-22.
//

#include "file_exists.h"

#include "doodle_core/platform/win/register_file_type.h"

#include "doodle_lib/core/http/http_session_data.h"
#include "doodle_lib/core/http/http_websocket_data.h"
namespace doodle::http {

namespace {
enum class department_ {
  角色模型,
  动画,
  特效,
  剪辑,
  原画,
  分镜,
  地编,
  绑定,
  解算,
  灯光,
  编剧,
  制片,
};

enum class task_type {
  道具,
  地编,
  角色,
};

struct file_exists_check {
  virtual bool operator()(std::string &msg, std::int32_t &in_err_code) = 0;
};

// 角色模型检查
struct role_model_check : public file_exists_check {
  FSys::path ue_file_;
  FSys::path maya_file_;
  explicit role_model_check(
      const project &in_project, const std::int32_t &in_season, const std::int32_t &in_episodes,
      const std::string &in_number, const std::string &in_name, const std::int32_t &in_UE_Version
  ) {
    auto l_season_begin = (in_season - 1) * 20 + 1;
    auto l_base_path =
        fmt::format("{}/6-moxing/Ch/JD{}_{}/Ch{}", in_project.get_path(), in_season, l_season_begin, in_number);
    // UE 项目路径
    ue_file_   = FSys::path(fmt::format("{0}/{1}_UE{2}/{1}_UE{2}.uproject", l_base_path, in_name, in_UE_Version));
    // UE 骨骼路径
    maya_file_ = FSys::path(fmt::format(
        "{0}/{1}_UE{2}/Content/Character/{1}/Meshs/SK_Ch{3}.uasset", l_base_path, in_name, in_UE_Version, in_number
    ));
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(ue_file_)) {
      msg         = fmt::format("UE文件不存在:{}", ue_file_);
      in_err_code = 2;
      return false;
    }
    if (!FSys::exists(maya_file_)) {
      msg         = fmt::format("maya文件不存在:{}", maya_file_);
      in_err_code = 3;
      return false;
    }
    return true;
  }
};
// 地编检查
struct ground_binding_check : public file_exists_check {
  FSys::path ue_path_;
  FSys::path maya_path_;
  std::string ue_file_reg_;
  std::string maya_file_reg_;
  explicit ground_binding_check(
      const project &in_project, const std::int32_t &in_season, const std::int32_t &in_episodes,
      const std::string &in_number, const std::string &in_name, const std::int32_t &in_UE_Version
  ) {
    auto l_season_begin = (in_season - 1) * 20 + 1;
    auto l_base_path =
        fmt::format("{}/6-moxing/BG/JD{}_{}/BG{}", in_project.get_path(), in_season, l_season_begin, in_number);
    ue_path_       = FSys::path(fmt::format("{0}/{1}/Content/{1}/Map", l_base_path, in_name));
    maya_path_     = FSys::path(fmt::format("{}/Mod", l_base_path));
    ue_file_reg_   = fmt::format("{}([a-zA-z_]+)?", in_name);
    maya_file_reg_ = fmt::format("{}([a-zA-z_]+)?_Low", in_name);
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(ue_path_)) {
      msg         = fmt::format("UE路径不存在:{}", ue_path_);
      in_err_code = 2;
      return false;
    }
    if (!FSys::exists(maya_path_)) {
      msg         = fmt::format("maya路径不存在:{}", maya_path_);
      in_err_code = 3;
      return false;
    }
    std::vector<std::string> l_ue_files{};
    for (auto &&l_path : FSys::directory_iterator{ue_path_}) {
      if (l_path.is_regular_file() && l_path.path().extension() == ".umap" &&
          std::regex_match(l_path.path().stem().generic_string(), std::regex(ue_file_reg_))) {
        l_ue_files.emplace_back(l_path.path().stem().generic_string());
      }
    }
    if (l_ue_files.empty()) {
      msg = fmt::format(
          "UE文件不存在于路径{}中, 或者不符合 {} + 版本模式", ue_path_, ue_file_reg_.substr(0, ue_file_reg_.size() - 13)
      );
      in_err_code = 4;
      return false;
    }
    std::vector<std::string> l_maya_files{};

    for (auto &&l_path : FSys::directory_iterator{maya_path_}) {
      if (l_path.is_regular_file() && l_path.path().extension() == ".ma" &&
          std::regex_match(l_path.path().stem().generic_string(), std::regex(maya_file_reg_))) {
        l_maya_files.emplace_back(l_path.path().stem().generic_string());
      }
    }
    if (l_maya_files.empty()) {
      msg = fmt::format(
          "maya文件不存在于路径{}中, 或者不符合 {} + 版本模式 + _Low", maya_path_,
          maya_file_reg_.substr(0, maya_file_reg_.size() - 17)
      );
      in_err_code = 5;
      return false;
    }
    if (l_ue_files.size() != l_maya_files.size()) {
      msg = fmt::format(
          "UE文件数量和maya文件数量不一致, UE文件数量:{}, maya文件数量:{}", l_ue_files.size(), l_maya_files.size()
      );
      in_err_code = 6;
      return false;
    }
    for (auto &&l_ue : l_ue_files) {
      auto l_f_name = l_ue + "_Low";
      if (std::ranges::find(l_maya_files, l_f_name) == l_maya_files.end()) {
        msg         = fmt::format("UE文件{}没有对应的maya文件", l_ue);
        in_err_code = 7;
        return false;
      }
    }
    return true;
  }
};

// 场景道具判断
struct scene_prop_check : public file_exists_check {
  FSys::path ue_path_;
  FSys::path maya_path_;
  std::string ue_file_reg_;
  std::string maya_file_reg_;
  explicit scene_prop_check(
      const project &in_project, const std::int32_t &in_season, const std::int32_t &in_episodes,
      const std::string &in_name
  ) {
    auto l_season_begin = (in_season - 1) * 20 + 1;
    auto l_base_path    = fmt::format("{}/6-moxing/Prop/JD{}_{}", in_project.get_path(), in_season, l_season_begin);
    ue_path_ =
        FSys::path(fmt::format("{}/JD{}_{}_UE/Content/Prop/{}/Mesh", l_base_path, in_season, l_season_begin, in_name));
    maya_path_     = FSys::path(fmt::format("{}/{}", l_base_path, in_name));
    ue_file_reg_   = fmt::format("{}([a-zA-z_]+)?", in_name);
    maya_file_reg_ = fmt::format("{}([a-zA-z_]+)?", in_name);
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(ue_path_)) {
      msg         = fmt::format("UE路径不存在:{}", ue_path_);
      in_err_code = 2;
      return false;
    }
    if (!FSys::exists(maya_path_)) {
      msg         = fmt::format("maya路径不存在:{}", maya_path_);
      in_err_code = 3;
      return false;
    }
    std::vector<std::string> l_ue_files{};
    for (auto &&l_path : FSys::directory_iterator{ue_path_}) {
      if (l_path.is_regular_file() && l_path.path().extension() == ".uasset" &&
          std::regex_match(l_path.path().stem().generic_string(), std::regex(ue_file_reg_))) {
        l_ue_files.emplace_back(l_path.path().stem().generic_string());
      }
    }
    if (l_ue_files.empty()) {
      msg = fmt::format(
          "UE文件不存在于路径{}中, 或者不符合 {} + 版本模式", ue_path_, ue_file_reg_.substr(0, ue_file_reg_.size() - 13)
      );
      in_err_code = 4;
      return false;
    }
    std::vector<std::string> l_maya_files{};
    for (auto &&l_path : FSys::directory_iterator{maya_path_}) {
      if (l_path.is_regular_file() && l_path.path().extension() == ".ma" &&
          std::regex_match(l_path.path().stem().generic_string(), std::regex(maya_file_reg_))) {
        l_maya_files.emplace_back(l_path.path().stem().generic_string());
      }
    }
    if (l_maya_files.empty()) {
      msg = fmt::format(
          "maya文件不存在于路径{}中, 或者不符合 {} + 版本模式", maya_path_,
          maya_file_reg_.substr(0, maya_file_reg_.size() - 13)
      );
      in_err_code = 5;
      return false;
    }
    if (l_ue_files.size() != l_maya_files.size()) {
      msg = fmt::format(
          "UE文件数量和maya文件数量不一致, UE文件数量:{}, maya文件数量:{}", l_ue_files.size(), l_maya_files.size()
      );
      in_err_code = 6;
      return false;
    }
    for (auto &&l_ue : l_ue_files) {
      if (std::ranges::find(l_maya_files, l_ue) == l_maya_files.end()) {
        msg         = fmt::format("UE文件{}没有对应的maya文件", l_ue);
        in_err_code = 7;
        return false;
      }
    }
    return true;
  }
};
// 角色rig检查
struct role_rig_check : public file_exists_check {
  FSys::path maya_path_;
  std::string maya_file_reg_;
  explicit role_rig_check(
      const project &in_project, const std::int32_t &in_season, const std::int32_t &in_episodes,
      const std::string &in_number, const std::string &in_name
  ) {
    auto l_season_begin = (in_season - 1) * 20 + 1;
    auto l_base_path =
        fmt::format("{}/6-moxing/Ch/JD{}_{}/Ch{}", in_project.get_path(), in_season, l_season_begin, in_number);
    maya_path_     = FSys::path(fmt::format("{}/Rig", l_base_path));
    maya_file_reg_ = fmt::format("Ch{}_rig([_a-zA-Z]+)?", in_number);
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(maya_path_)) {
      msg         = fmt::format("maya路径不存在:{}", maya_path_);
      in_err_code = 3;
      return false;
    }
    std::vector<std::string> l_maya_files{};
    for (auto &&l_path : FSys::directory_iterator{maya_path_}) {
      if (l_path.is_regular_file() && l_path.path().extension() == ".ma" &&
          std::regex_match(l_path.path().stem().generic_string(), std::regex(maya_file_reg_))) {
        l_maya_files.emplace_back(l_path.path().stem().generic_string());
      }
    }
    if (l_maya_files.empty()) {
      msg = fmt::format(
          "maya文件不存在于路径{}中, 或者不符合 {} + 版本模式 + _rig", maya_path_,
          maya_file_reg_.substr(0, maya_file_reg_.size() - 9)
      );
      in_err_code = 5;
      return false;
    }
    if (l_maya_files.size() > 2) {
      msg         = fmt::format("maya文件数量大于2, 请检查文件数量");
      in_err_code = 6;
      return false;
    }
    return true;
  }
};

// 场景rig检查
struct scene_rig_check : public file_exists_check {
  FSys::path maya_path_;
  std::string maya_file_reg_;
  explicit scene_rig_check(
      const project &in_project, const std::int32_t &in_season, const std::int32_t &in_episodes,
      const std::string &in_name, const std::string &in_number
  ) {
    auto l_season_begin = (in_season - 1) * 20 + 1;
    auto l_base_path =
        fmt::format("{}/6-moxing/BG/JD{}_{}/BG{}", in_project.get_path(), in_season, l_season_begin, in_number);
    maya_path_     = FSys::path(fmt::format("{}/Mod", l_base_path));
    maya_file_reg_ = fmt::format("{}([a-zA-z_]+)?_Low", in_name);
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(maya_path_)) {
      msg         = fmt::format("maya路径不存在:{}", maya_path_);
      in_err_code = 3;
      return false;
    }
    std::vector<std::string> l_maya_files{};
    for (auto &&l_path : FSys::directory_iterator{maya_path_}) {
      if (l_path.is_regular_file() && l_path.path().extension() == ".ma" &&
          std::regex_match(l_path.path().stem().generic_string(), std::regex(maya_file_reg_))) {
        l_maya_files.emplace_back(l_path.path().stem().generic_string());
      }
    }
    if (l_maya_files.empty()) {
      msg = fmt::format(
          "maya文件不存在于路径{}中, 或者不符合 {} + 版本模式 + _Low", maya_path_,
          maya_file_reg_.substr(0, maya_file_reg_.size() - 17)
      );
      in_err_code = 5;
      return false;
    }
    return true;
  }
};

// 场景道具rig检查
struct scene_prop_rig_check : public file_exists_check {
  FSys::path maya_path_;
  std::string maya_file_reg_;
  explicit scene_prop_rig_check(
      const project &in_project, const std::int32_t &in_season, const std::int32_t &in_episodes,
      const std::string &in_name
  ) {
    auto l_season_begin = (in_season - 1) * 20 + 1;
    auto l_base_path    = fmt::format("{}/6-moxing/Prop/JD{}_{}", in_project.get_path(), in_season, l_season_begin);

    maya_path_          = FSys::path(fmt::format("{}/{}/Rig", l_base_path, in_name));
    maya_file_reg_      = fmt::format("{}_rig([_a-zA-Z]+)?", in_name);
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(maya_path_)) {
      msg         = fmt::format("maya路径不存在:{}", maya_path_);
      in_err_code = 3;
      return false;
    }
    std::vector<std::string> l_maya_files{};
    for (auto &&l_path : FSys::directory_iterator{maya_path_}) {
      if (l_path.is_regular_file() && l_path.path().extension() == ".ma" &&
          std::regex_match(l_path.path().stem().generic_string(), std::regex(maya_file_reg_))) {
        l_maya_files.emplace_back(l_path.path().stem().generic_string());
      }
    }
    if (l_maya_files.empty()) {
      msg = fmt::format(
          "maya文件不存在于路径{}中, 或者不符合 {} + 版本模式 + _rig", maya_path_,
          maya_file_reg_.substr(0, maya_file_reg_.size() - 9)
      );
      in_err_code = 5;
      return false;
    }
    if (l_maya_files.size() > 2) {
      msg         = fmt::format("maya文件数量大于2, 请检查文件数量");
      in_err_code = 6;
      return false;
    }
    return true;
  }
};

// 动画文件检查
struct animation_file_check : public file_exists_check {
  FSys::path maya_path_;
  explicit animation_file_check(
      const project &in_project, const std::int32_t &in_season, const std::int32_t &in_episodes,
      const std::string in_shot
  ) {
    maya_path_ = fmt::format(
        "{}/03_Workflow/Shots/EP{:03}/ma/{}_EP{:03}_SC{}.ma", in_project.get_path(), in_episodes,
        in_project.short_str(), in_episodes, in_shot
    );
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(maya_path_)) {
      msg         = fmt::format("maya路径不存在:{}", maya_path_);
      in_err_code = 3;
      return false;
    }
    return true;
  }
};

// 解算资产文件检查
struct solve_asset_file_check : public file_exists_check {
  FSys::path maya_path_;
  std::string maya_file_reg_;
  explicit solve_asset_file_check(const project &in_project, const std::string &in_number) {
    maya_path_     = fmt::format("{}/6-moxing/CFX/", in_project.get_path());
    maya_file_reg_ = fmt::format("Ch{}_rig([_a-zA-Z]+)?_cloth", in_number);
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(maya_path_)) {
      msg         = fmt::format("maya路径不存在:{}", maya_path_);
      in_err_code = 3;
      return false;
    }
    std::vector<std::string> l_maya_files{};
    for (auto &&l_path : FSys::directory_iterator{maya_path_}) {
      if (l_path.is_regular_file() && l_path.path().extension() == ".ma" &&
          std::regex_match(l_path.path().stem().generic_string(), std::regex(maya_file_reg_))) {
        l_maya_files.emplace_back(l_path.path().stem().generic_string());
      }
    }
    if (l_maya_files.empty()) {
      msg = fmt::format(
          "maya文件不存在于路径{}中, 或者不符合 {} + 版本模式 + _cloth", maya_path_,
          maya_file_reg_.substr(0, maya_file_reg_.size() - 6)
      );
      in_err_code = 5;
      return false;
    }
    if (l_maya_files.size() > 2) {
      msg         = fmt::format("maya文件数量大于2, 请检查文件数量");
      in_err_code = 6;
      return false;
    }
    return true;
  }
};
// 解算文件检查
struct solve_file_check : public file_exists_check {
  FSys::path maya_path_;
  explicit solve_file_check(
      const project &in_project, const std::int32_t &in_season, const std::int32_t &in_episodes,
      const std::string in_shot
  ) {
    maya_path_ = fmt::format(
        "{}/03_Workflow/Shots/EP{:03}JS/ma/{}_EP{:03}_SC{}.ma", in_project.get_path(), in_episodes,
        in_project.short_str(), in_episodes, in_shot
    );
  };

  bool operator()(std::string &msg, std::int32_t &in_err_code) override {
    if (!FSys::exists(maya_path_)) {
      msg         = fmt::format("maya路径不存在:{}", maya_path_);
      in_err_code = 3;
      return false;
    }
    return true;
  }
};

}  // namespace

void file_exists::file_exists_fun(boost::system::error_code in_error_code, const http_session_data_ptr &in_handle) {
  auto l_logger    = in_handle->logger_;
  auto &session    = *in_handle;
  auto l_url_query = session.url_.query();

  project l_project{};

  if (auto l_it = l_url_query.find("project"); l_it != l_url_query.npos) {
    auto l_project_str = l_url_query.substr(l_it + 8, l_url_query.find('&', l_it) - l_it - 8);
    auto l_projects    = register_file_type::get_project_list();
    if (auto l_it_prj = std::ranges::find_if(
            l_projects, [&](const project &in_project) -> bool { return in_project.get_name() == l_project_str; }
        );
        l_it_prj == l_projects.end()) {
      session.seed_error(
          boost::beast::http::status::not_found, error_enum::bad_url, fmt::format("项目不存在 {}", l_project_str)
      );
      return;
    } else
      l_project = *l_it_prj;
  } else {
    session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "缺失项目参数");
    return;
  }

  department_ l_department{};
  if (auto l_it = l_url_query.find("department"); l_it != l_url_query.npos) {
    auto l_department_str = l_url_query.substr(l_it + 11, l_url_query.find('&', l_it) - l_it - 11);
    auto l_dep            = magic_enum::enum_cast<department_>(l_department_str);
    if (!l_dep) {
      session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "部门参数错误");
      return;
    }
    l_department = *l_dep;
  } else {
    session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "缺失部门参数");
    return;
  }

  task_type l_task_type{};
  std::int32_t l_season{};
  std::int32_t l_episodes{};
  std::string l_shot{};
  std::string l_number{};
  std::string l_name{};
  std::int32_t l_UE_Version{5};
  switch (l_department) {
    case department_::绑定: {
      if (auto l_it = l_url_query.find("task_type"); l_it != l_url_query.npos) {
        auto l_task_type_str = l_url_query.substr(l_it + 10, l_url_query.find('&', l_it) - l_it - 10);
        auto l_task_t        = magic_enum::enum_cast<task_type>(l_task_type_str);
        if (!l_task_t) {
          session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "任务类型参数错误");
          return;
        }
        l_task_type = *l_task_t;
      } else {
        session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "缺失任务类型参数");
        return;
      }
    }
    case department_::角色模型: {
      // UE_Version
      if (auto l_it = l_url_query.find("UE_Version"); l_it != l_url_query.npos) {
        if (auto l_end = l_url_query.find('&', l_it); l_end != l_url_query.npos)
          l_UE_Version = std::stoi(l_url_query.substr(l_it + 11, l_end - l_it - 11));
      }
    }
    case department_::地编: {
      if (auto l_it = l_url_query.find("season"); l_it != l_url_query.npos) {
        auto l_season_str = l_url_query.substr(l_it + 7, l_url_query.find('&', l_it) - l_it - 7);
        if (l_season_str.empty()) {
          session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "季度参数错误");
          return;
        }
        l_season = std::stoi(l_season_str);
      } else {
        session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "缺失季度参数");
        return;
      }
      // name
      if (auto l_it = l_url_query.find("name"); l_it != l_url_query.npos) {
        l_name = l_url_query.substr(l_it + 5, l_url_query.find('&', l_it) - l_it - 5);
      } else {
        session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "缺失名称参数");
        return;
      }
      // number
      if (auto l_it = l_url_query.find("number"); l_it != l_url_query.npos) {
        l_number = l_url_query.substr(l_it + 7, l_url_query.find('&', l_it) - l_it - 7);
      } else {
        session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "缺失编号参数");
        return;
      }

      break;
    }

    case department_::动画:
    case department_::解算: {
      // episodes
      if (auto l_it = l_url_query.find("episodes"); l_it != l_url_query.npos) {
        auto l_ep_str = l_url_query.substr(l_it + 9, l_url_query.find('&', l_it) - l_it - 9);
        if (l_ep_str.empty()) {
          session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "集数参数错误");
          return;
        }
        l_episodes = std::stoi(l_ep_str);
      } else {
        session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "缺失集数参数");
        return;
      }
      // shot
      if (auto l_it = l_url_query.find("shot"); l_it != l_url_query.npos) {
        l_shot = l_url_query.substr(l_it + 5, l_url_query.find('&', l_it) - l_it - 5);
      } else {
        session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "缺失shot参数");
        return;
      }
      break;
    }

    default: {
      return session.seed_error(boost::beast::http::status::bad_request, error_enum::bad_url, "部门不支持");
    }
  }

  boost::beast::http::response<boost::beast::http::string_body> l_response{
      boost::beast::http::status::ok, session.request_parser_->get().version()
  };
  l_response.keep_alive(session.request_parser_->get().keep_alive());
  l_response.set(boost::beast::http::field::content_type, "application/json");
  std::shared_ptr<file_exists_check> l_check{};
  {
    auto l_season_begin = (l_season - 1) * 20 + 1;
    switch (l_department) {
      case department_::角色模型: {
        l_check = std::make_shared<role_model_check>(l_project, l_season, l_episodes, l_number, l_name, l_UE_Version);
        break;
      }
      case department_::地编: {
        switch (l_task_type) {
          case task_type::道具: {
            l_check = std::make_shared<scene_prop_check>(l_project, l_season, l_episodes, l_name);
            break;
          }
          case task_type::地编: {
            l_check =
                std::make_shared<ground_binding_check>(l_project, l_season, l_episodes, l_number, l_name, l_UE_Version);
            break;
          }
          case task_type::角色:
          default:
            break;
        }
        break;
      }
      case department_::绑定: {
        switch (l_task_type) {
          case task_type::角色: {
            l_check = std::make_shared<role_rig_check>(l_project, l_season, l_episodes, l_number, l_name);
            break;
          }
          case task_type::地编: {
            l_check = std::make_shared<scene_rig_check>(l_project, l_season, l_episodes, l_name, l_number);
            break;
          }
          case task_type::道具: {
            l_check = std::make_shared<scene_prop_rig_check>(l_project, l_season, l_episodes, l_name);
            break;
          }
        }
        break;
      }
      case department_::动画: {
        l_check = std::make_shared<animation_file_check>(l_project, l_season, l_episodes, l_shot);
        break;
      }
      case department_::解算: {
        //        l_check = std::make_shared<solve_asset_file_check>(l_project, l_number);
        //        break;
      }
      case department_::原画:
      case department_::剪辑:
      case department_::分镜:
      case department_::编剧:
      case department_::灯光:
      case department_::制片:
      case department_::特效:
      default: {
        l_response.body() = R"({"result": "false", "error_code": 1, "msg":"部门不支持"})";
        return session.seed(std::move(l_response));
      }
    }
  }
  std::string l_msg{};
  std::int32_t l_err_code{};
  try {
    if (!(*l_check)(l_msg, l_err_code)) {
      l_response.body() = fmt::format(R"({{"result": "false", "error_code": {}, "msg":"{}"}})", l_err_code, l_msg);
    } else {
      l_response.body() = R"({"result": "true", "error_code": 0, "msg":"文件存在"})";
    }
  } catch (const FSys::filesystem_error &in_error) {
    l_response.body() = fmt::format(R"({{"result": "false", "error_code": 10, "msg":"{}"}})", in_error.what());
  }
  l_response.set(boost::beast::http::field::access_control_allow_origin, "*");
  l_response.prepare_payload();
  session.seed(std::move(l_response));
}

void file_exists_fun_options(boost::system::error_code in_error_code, const http_session_data_ptr &in_handle) {
  auto &session = *in_handle;
  boost::beast::http::response<boost::beast::http::string_body> l_response{
      boost::beast::http::status::ok, session.request_parser_->get().version()
  };
  l_response.keep_alive(session.request_parser_->get().keep_alive());
  l_response.set(boost::beast::http::field::content_type, "application/json");
  l_response.set(boost::beast::http::field::allow, "GET, OPTIONS");
  l_response.set(boost::beast::http::field::access_control_allow_origin, "*");
  l_response.set(boost::beast::http::field::access_control_allow_methods, "GET, OPTIONS");
  l_response.set(boost::beast::http::field::access_control_allow_headers, "Content-Type");
  l_response.prepare_payload();
  session.seed(std::move(l_response));
}

void file_exists::reg(doodle::http::http_route &in_route) {
  in_route
      .reg(std::make_shared<http_function>(
          boost::beast::http::verb::get, "api/file_exists",
          session::make_http_reg_fun(boost::asio::bind_executor(g_thread(), &file_exists::file_exists_fun))
      ))
      .reg(std::make_shared<http_function>(
          boost::beast::http::verb::options, "api/file_exists",
          session::make_http_reg_fun(boost::asio::bind_executor(g_thread(), &file_exists_fun_options))
      ));
}
}  // namespace doodle::http
 * 
 * 
 */

// import { existsSync } from "original-fs";

// const prj_data = {
//   name: {
//     type: String,
//     required: true
//   },
//   department: {
//     type: String,
//     required: true
//   },
//   task_type: {
//     type: String,
//     required: true
//   },
//   season: {
//     type: Number,
//   },
//   episodes: {
//     type: Number,
//   },
//   shot: {
//     type: String,
//   },
//   number: {
//     type: String,
//   },
//   task_name: {
//     type: String,
//   }
// }
const project_map = {
  独步逍遥: '//192.168.10.250/public/DuBuXiaoYao_3',
  万古邪帝: '//192.168.10.240/public/WGXD',
  龙脉武神: '//192.168.10.240/public/LongMaiWuShen',
  炼气十万年: '//192.168.10.240/public/LianQiShiWanNian',
  人间最得意: '//192.168.10.240/public/renjianzuideyi',
  无敌剑魂: '//192.168.10.240/public/WuDiJianHun',
  万古神话: '//192.168.10.240/public/WanGuShenHua',
  无尽神域: '//192.168.10.240/public/WuJinShenYu',
  万域封神: '//192.168.10.218/WanYuFengShen'
}

// 角色模型检查
function role_model_check(project_data, callback) {
  const l_season_begin = (project_data.season - 1) * 20 + 1
  const ue_file = `${project_map[project_data.name]}/6-moxing/Ch/JD${project_data.season}_${l_season_begin}/Ch${project_data.number}/${project_data.task_name}_UE${project_data.UE_Version}/${project_data.task_name}_UE${project_data.UE_Version}.uproject`
  const ue_sk = `${project_map[project_data.name]}/6-moxing/Ch/JD${project_data.season}_${l_season_begin}/Ch${project_data.number}/${project_data.task_name}_UE${project_data.UE_Version}/Content/Character/${project_data.task_name}/Meshs/SK_Ch${project_data.number}.uasset`

  if (!fs.existsSync(ue_file)) {
    callback(false, `ue文件不存在: ${ue_file}`)
    return
  }

  if (!fs.existsSync(ue_sk)) {
    callback(false, `sk文件不存在: ${ue_sk}`)
    return
  }

  callback(true)
}

// 地编检查
function ground_binding_check(project_data, callback) {
  const l_season_begin = (project_data.season - 1) * 20 + 1
  const ue_file = `${project_map[project_data.name]}/6-moxing/BG/JD${project_data.season}_${l_season_begin}/BG${project_data.number}/${project_data.task_name}/Content/${project_data.task_name}/Map/${project_data.task_name}.uproject`
  const maya_file = `${project_map[project_data.name]}/6-moxing/BG/JD${project_data.season}_${l_season_begin}/BG${project_data.number}/${project_data.task_name}/Mod/${project_data.task_name}.ma`

  if (!fs.existsSync(ue_file)) {
    callback(false, `ue文件不存在: ${ue_file}`)
    return
  }

  if (!fs.existsSync(maya_file)) {
    callback(false, `maya文件不存在: ${maya_file}`)
    return
  }

  callback(true)
}
// 场景道具判断
function scene_prop_check(project_data, callback) {
  const l_season_begin = (project_data.season - 1) * 20 + 1
  const ue_path = `${project_map[project_data.name]}/6-moxing/Prop/JD${project_data.season}_${l_season_begin}/${project_data.task_name}/Mesh`
  const maya_path = `${project_map[project_data.name]}/6-moxing/Prop/JD${project_data.season}_${l_season_begin}/${project_data.task_name}`
  const ue_file_reg = `${project_data.task_name}([a-zA-z_]+)?`
  const maya_file_reg = `${project_data.task_name}([a-zA-z_]+)?`

  if (!fs.existsSync(ue_path)) {
    callback(false, `ue目录不存在: ${ue_path}`)
    return
  }
  if (!fs.existsSync(maya_path)) {
    callback(false, `maya目录不存在: ${maya_path}`)
    return
  }
  const ue_files = fs.readdirSync(ue_path)
  const ue_reg = new RegExp(ue_file_reg)
  const ue_cpunt = ue_files.filter(file => {
    return ue_reg.test(fs.stem(file))
  }).length
  if (ue_cpunt === 0) {
    callback(false, `ue文件不存在: ${ue_path}`)
    return
  }
  const maya_files = fs.readdirSync(maya_path)
  const maya_reg = new RegExp(maya_file_reg)
  const maya_count = maya_files.filter(file => {
    return maya_reg.test(fs.stem(file))
  }).length
  if (maya_count === 0) {
    callback(false, `maya文件不存在: ${maya_path}`)
    return
  }

  callback(true)
}

// 角色rig检查
function role_rig_check(project_data, callback) {
  const l_season_begin = (project_data.season - 1) * 20 + 1
  const maya_path = `${project_map[project_data.name]}/6-moxing/Ch/JD${project_data.season}_${l_season_begin}/Ch${project_data.number}/Rig`
  const maya_file_reg = `Ch${project_data.number}_rig([_a-zA-Z]+)?`

  if (!fs.existsSync(maya_path)) {
    callback(false, `maya目录不存在: ${maya_path}`)
    return
  }
  const maya_files = fs.readdirSync(maya_path)
  const maya_reg = new RegExp(maya_file_reg)
  const maya_count = maya_files.filter(file => {
    return maya_reg.test(fs.stem(file))
  }).length
  if (maya_count === 0) {
    callback(false, `maya文件不存在: ${maya_path}`)
    return
  }

  callback(true)
}

// 场景rig检查
function scene_rig_check(project_data, callback) {
  const l_season_begin = (project_data.season - 1) * 20 + 1
  const maya_path = `${project_map[project_data.name]}/6-moxing/BG/JD${project_data.season}_${l_season_begin}/BG${project_data.number}/Mod`
  const maya_file_reg = `${project_data.task_name}([a-zA-z_]+)?_Low`

  if (!fs.existsSync(maya_path)) {
    callback(false, `maya目录不存在: ${maya_path}`)
    return
  }
  const maya_files = fs.readdirSync(maya_path)
  const maya_reg = new RegExp(maya_file_reg)
  const maya_count = maya_files.filter(file => {
    return maya_reg.test(fs.stem(file))
  }).length
  if (maya_count === 0) {
    callback(false, `maya文件不存在: ${maya_path}`)
    return
  }

  callback(true)
}

// 场景道具rig检查
function scene_prop_rig_check(project_data, callback) {
  const l_season_begin = (project_data.season - 1) * 20 + 1
  const maya_path = `${project_map[project_data.name]}/6-moxing/Prop/JD${project_data.season}_${l_season_begin}/${project_data.task_name}/Rig`
  const maya_file_reg = `${project_data.task_name}_rig([_a-zA-Z]+)?`

  if (!fs.existsSync(maya_path)) {
    callback(false, `maya目录不存在: ${maya_path}`)
    return
  }
  const maya_files = fs.readdirSync(maya_path)
  const maya_reg = new RegExp(maya_file_reg)
  const maya_count = maya_files.filter(file => {
    return maya_reg.test(fs.stem(file))
  }).length
  if (maya_count === 0) {
    callback(false, `maya文件不存在: ${maya_path}`)
    return
  }

  callback(true)
}

// 动画文件检查
function animation_file_check(project_data, callback) {
  const maya_path = `${project_map[project_data.name]}/03_Workflow/Shots/EP${project_data.episodes}/ma/${project_data.name.short_str()}_EP${project_data.episodes}_SC${project_data.shot}.ma`
  if (!fs.existsSync(maya_path)) {
    callback(false, `maya文件不存在: ${maya_path}`)
    return
  }
  callback(true)
}

// // 解算资产文件检查
// function solve_asset_file_check(project_data, callback) {
//   const l_season_begin = (project_data.season - 1) * 20 + 1;
//   const maya_path = `${project_map[project_data.name]}/6-moxing/CFX/`;
//   const maya_file_reg = `Ch${project_data.number}_rig([_a-zA-Z]+)?_cloth`;

//   if (!fs.existsSync(maya_path)) {
//     callback(false, `maya目录不存在: ${maya_path}`);
//     return;
//   }
//   const maya_files = fs.readdirSync(maya_path);
//   const maya_reg = new RegExp(maya_file_reg);
//   const maya_count = maya_files.filter((file) => {
//     return maya_reg.test(fs.stem(file));
//   }).length;
//   if (maya_count === 0) {
//     callback(false, `maya文件不存在: ${maya_path}`);
//     return;
//   }

//   callback(true);
// }

// 解算文件检查
// function solve_file_check(project_data, callback) {
//   const maya_path = `${project_map[project_data.name]}/03_Workflow/Shots/EP${project_data.episodes}JS/ma/${project_data.name.short_str()}_EP${project_data.episodes}_SC${project_data.shot}.ma`;
//   if (!fs.existsSync(maya_path)) {
//     callback(false, `maya文件不存在: ${maya_path}`);
//     return;
//   }
//   callback(true);
// }

const fs = {
  exists(path, callback) {
    window.electron.fileExists(path, callback)
  },
  existsSync(path) {
    return window.electron.fileExistsSync(path)
  },
  readdirSync(path) {
    return window.electron.readdirSync(path)
  },
  stem(path) {
    return window.electron.filefilestem(path)
  },
  projectFileExists(project_data, callback) {
    const project_path = project_map[project_data.name]
    if (project_path === undefined) {
      callback(false)
      return
    }
    switch (project_data.department) {
      case '角色模型':
        role_model_check(project_data, callback)
        break
      case '地编':
        switch (project_data.task_type) {
          case '道具':
            scene_prop_check(project_data, callback)
            break
          case '地编':
            ground_binding_check(project_data, callback)
            break
          case '角色':
          default:
            break
        }
        break
      case '绑定':
        switch (project_data.task_type) {
          case '角色':
            role_rig_check(project_data, callback)
            break
          case '地编':
            scene_rig_check(project_data, callback)
            break
          case '道具':
            scene_prop_rig_check(project_data, callback)
            break
        }
        break
      case '动画':
        animation_file_check(project_data, callback)
        break
      default:
        callback(true)
        return
    }
  }
}

export default fs
